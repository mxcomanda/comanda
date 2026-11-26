import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { verifySessionRoles, type Role } from "@/lib/auth";
import { dbCocuyos, accountTotal } from "@/lib/store-cocuyos";
import { hasPostgres, getKitchenItems, getKitchenAlerts, advanceItemStatus, setKitchenAlert } from "@/lib/pg-cocuyos";

function roleOf(req: Request): Role[] {
  return verifySessionRoles(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "cocuyos");
}

export async function GET(req: Request) {
  const roles = roleOf(req);
  if (!roles.includes("cocina") && !roles.includes("caja"))
    return NextResponse.json({ error: "Tu rol no tiene acceso a Cocina" }, { status: 403 });
  const role = roles[0];
  const station = new URL(req.url).searchParams.get("station") ?? null;
  if (hasPostgres) {
    const items = await getKitchenItems(station);
    const alerts = await getKitchenAlerts();
    return NextResponse.json({ role, roles, station, items, alerts });
  }
  const items = dbCocuyos.accounts.filter((a) => a.status === "abierta" || a.status === "cuenta-pedida").flatMap((a) => a.items.filter((i) => i.status !== "espera" && i.status !== "cancelado" && (!station || i.station === station || i.kitchen === station)).map((i) => ({ ...i, table: a.tableLabel, accountId: a.id })));
  const alerts = dbCocuyos.accounts.filter((a) => (a as any).kitchenAlert && a.status !== "cerrada").map((a) => ({ accountId: a.id, tableLabel: a.tableLabel }));
  return NextResponse.json({ role, roles, station, items, alerts });
}

// Avanza el estado de un platillo: pendiente → preparando → listo.
// Solo Cocina y Caja. "Listo" es lo que dispara el aviso al mesero.
export async function POST(req: Request) {
  const roles = roleOf(req);
  if (!roles.includes("cocina") && !roles.includes("caja"))
    return NextResponse.json({ error: "Tu rol no tiene acceso a Cocina" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (body?.action === "clear-alert" && body?.accountId) {
    if (hasPostgres) { await setKitchenAlert(String(body.accountId), false); return NextResponse.json({ ok: true }); }
    const acc = dbCocuyos.accounts.find((a) => a.id === body.accountId);
    if (acc) (acc as any).kitchenAlert = false;
    return NextResponse.json({ ok: true });
  }
  if (!body?.itemId) return NextResponse.json({ error: "Falta el platillo" }, { status: 400 });
  if (hasPostgres) {
    const result = await advanceItemStatus(String(body.itemId));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, status: result.status });
  }
  // Cocina avanza: pendiente → preparando → listo. La entrega NO la
  // marca cocina: un platillo listo se queda en "listo" hasta que el
  // MESERO lo marca entregado desde su vista.
  const NEXT: Record<string, string> = { pendiente: "preparando", preparando: "listo" };
  for (const a of dbCocuyos.accounts) {
    const it = a.items.find((i) => i.id === body.itemId);
    if (it) {
      const next = NEXT[it.status];
      if (!next) return NextResponse.json({ error: `El platillo ya está ${it.status}` }, { status: 400 });
      it.status = next as typeof it.status;
      a.totalCents = accountTotal(a.items);
      return NextResponse.json({ ok: true, status: next });
    }
  }
  return NextResponse.json({ error: "Platillo no encontrado" }, { status: 404 });
}
