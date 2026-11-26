import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { hashPin, isValidPinFormat, signSession, verifySession, verifySessionRoles, SESSION_MAX_AGE_SECS } from "@/lib/auth";
import { dbCocuyos } from "@/lib/store-cocuyos";
import { hasPostgres, getStaffPins, setStaffPins } from "@/lib/pg-cocuyos";

type Role = "cocina" | "mesero" | "caja";

async function readPins(): Promise<Record<string, string>> {
  return hasPostgres ? getStaffPins() : dbCocuyos.staffPins;
}

async function writePins(pins: Record<string, string>): Promise<void> {
  if (hasPostgres) await setStaffPins(pins);
  else for (const [role, hash] of Object.entries(pins)) dbCocuyos.staffPins[role] = hash;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body?.action === "verify") {
    const pin = String(body.pin ?? "");
    const pins = await readPins();
    const role = (Object.keys(pins) as Role[]).find((r) => pins[r] === hashPin(pin));
    if (!role) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
    const res = NextResponse.json({ ok: true, role });
    // Sesión multi-rol: el login AGREGA este rol a la sesión que ya había
    // en el navegador (no la reemplaza). Cookie persistente de 1 año.
    const existing = req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1];
    res.cookies.set("comanda_staff", signSession("cocuyos", role, existing), { httpOnly: true, path: "/", maxAge: SESSION_MAX_AGE_SECS, sameSite: "lax" });
    return res;
  }
  if (body?.action === "setup") {
    // Primera vez: solo si aún no hay clave de Caja. Después, solo Caja las cambia.
    const existing = await readPins();
    if (existing.caja) return NextResponse.json({ error: "Las claves ya están configuradas. Solo Caja las puede cambiar." }, { status: 400 });
    const pins = body.pins as Record<string, string>;
    for (const [role, pin] of Object.entries(pins ?? {})) {
      if (!["caja", "cocina", "mesero"].includes(role)) return NextResponse.json({ error: `Rol no válido: ${role}` }, { status: 400 });
      if (!isValidPinFormat(pin)) return NextResponse.json({ error: `La clave de ${role} debe tener 4 a 8 dígitos` }, { status: 400 });
    }
    const values = Object.values(pins ?? {});
    if (values.length !== 3) return NextResponse.json({ error: "Se necesitan las tres claves: Caja, Cocina y Meseros" }, { status: 400 });
    if (new Set(values).size !== values.length) return NextResponse.json({ error: "Las tres claves deben ser distintas" }, { status: 400 });
    const hashed: Record<string, string> = {};
    for (const [role, pin] of Object.entries(pins)) hashed[role] = hashPin(pin);
    await writePins(hashed);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}

export async function GET(req: Request) {
  const roles = verifySessionRoles(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "cocuyos");
  const role = verifySession(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "cocuyos");
  const pins = await readPins();
  return NextResponse.json({ configured: { caja: Boolean(pins.caja), cocina: Boolean(pins.cocina), mesero: Boolean(pins.mesero) }, yourRole: role, roles });
}
