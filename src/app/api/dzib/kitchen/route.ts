import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { verifySession } from "@/lib/auth";
import { db, accountTotal } from "@/lib/store";
import { hasPostgres, getKitchenItems, getKitchenAlerts, advanceItemStatus, setKitchenAlert } from "@/lib/pg";

function roleOf(req: Request) {
  return verifySession(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "dzib");
}

export async function GET(req: Request) {
  const role = roleOf(req);
  if (role !== "cocina" && role !== "caja")
    return NextResponse.json({ error: "Tu rol no tiene acceso a Cocina" }, { status: 403 });
  const kitchen = new URL(req.url).searchParams.get("kitchen") ?? "cocina-a";
  if (hasPostgres) {
    const items = await getKitchenItems(kitchen);
    const alerts = await getKitchenAlerts();
    return NextResponse.json({ role, kitchen, items, alerts });
  }
  const items = db.accounts.filter((a) => a.status === "abierta" || a.status === "cuenta-pedida").flatMap((a) => a.items.filter((i) => i.status !== "espera" && i.status !== "cancelado" && (i.kitchen === kitchen || i.kitchen === "ambas")).map((i) => ({ ...i, table: a.tableLabel, accountId: a.id })));
  const alerts = db.accounts.filter((a) => (a as any).kitchenAlert && a.status !== "cerrada").map((a) => ({ accountId: a.id, tableLabel: a.tableLabel }));
  return NextResponse.json({ role, kitchen, items, alerts });
}

// Avanza el estado de un platillo: pendiente → preparando → listo → entregado.
// Solo Cocina y Caja. "Listo" es lo que dispara el aviso al mesero.
export async function POST(req: Request) {
  const role = roleOf(req);
  if (role !== "cocina" && role !== "caja")
    return NextResponse.json({ error: "Tu rol no tiene acceso a Cocina" }, { status: 403 });
  const body = await req.json().catch(() => null);
  if (body?.action === "clear-alert" && body?.accountId) {
    if (hasPostgres) { await setKitchenAlert(String(body.accountId), false); return NextResponse.json({ ok: true }); }
    const acc = db.accounts.find((a) => a.id === body.accountId);
    if (acc) (acc as any).kitchenAlert = false;
    return NextResponse.json({ ok: true });
  }
  if (!body?.itemId) return NextResponse.json({ error: "Falta el platillo" }, { status: 400 });
  if (hasPostgres) {
    const result = await advanceItemStatus(String(body.itemId));
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, status: result.status });
  }
  const NEXT: Record<string, string> = { pendiente: "preparando", preparando: "listo", listo: "entregado" };
  for (const a of db.accounts) {
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
