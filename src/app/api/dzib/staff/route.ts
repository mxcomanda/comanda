import { NextResponse } from "next/server";
import { hashPin, isValidPinFormat, signSession, verifySession } from "@/lib/auth";
import { db } from "@/lib/store";
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (body?.action === "verify") {
    const pin = String(body.pin ?? "");
    const role = (Object.keys(db.staffPins) as ("cocina" | "mesero" | "caja")[]).find((r) => db.staffPins[r] === hashPin(pin));
    if (!role) return NextResponse.json({ error: "Clave incorrecta" }, { status: 401 });
    const res = NextResponse.json({ ok: true, role });
    res.cookies.set("comanda_staff", signSession("dzib", role), { httpOnly: true, path: "/", maxAge: 12 * 60 * 60, sameSite: "lax" });
    return res;
  }
  if (body?.action === "setup") {
    // Primera vez: solo si aún no hay clave de Caja. Después, solo Caja las cambia.
    if (db.staffPins.caja) return NextResponse.json({ error: "Las claves ya están configuradas. Solo Caja las puede cambiar." }, { status: 400 });
    const pins = body.pins as Record<string, string>;
    for (const [role, pin] of Object.entries(pins ?? {})) {
      if (!isValidPinFormat(pin)) return NextResponse.json({ error: `La clave de ${role} debe tener 4 a 8 dígitos` }, { status: 400 });
    }
    const values = Object.values(pins ?? {});
    if (new Set(values).size !== values.length) return NextResponse.json({ error: "Las tres claves deben ser distintas" }, { status: 400 });
    for (const [role, pin] of Object.entries(pins)) db.staffPins[role] = hashPin(pin);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
export async function GET(req: Request) {
  const role = verifySession(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "dzib");
  return NextResponse.json({ configured: { caja: Boolean(db.staffPins.caja), cocina: Boolean(db.staffPins.cocina), mesero: Boolean(db.staffPins.mesero) }, yourRole: role });
}
