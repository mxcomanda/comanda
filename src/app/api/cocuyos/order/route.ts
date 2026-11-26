import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { dbCocuyos, newCocuyosItemId, accountTotal } from "@/lib/store-cocuyos";
import { COCUYOS_TABLES, cocuyosItemById } from "@/data/cocuyos";
import { hasPostgres, getOrCreateAccount, getOpenAccountByTable, getAccountWithItems, addOrderItems, setAccountPayment } from "@/lib/pg-cocuyos";
import type { Account } from "@/lib/types";

// Estado de una cuenta (lo usa el comensal para su panel y el mesero).
// GET ?accountId=… → una cuenta por id.
// GET ?tableId=N → la cuenta ABIERTA de esa mesa (para que el pedido no
// se pierda al cambiar de dispositivo: cualquier celular con el QR de la
// mesa ve la misma cuenta, porque la fuente de verdad es Postgres, no
// el navegador).
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tableId = Number(params.get("tableId") ?? "");
  if (tableId) {
    if (hasPostgres) {
      const account = await getOpenAccountByTable(tableId);
      return NextResponse.json({ ok: true, account });
    }
    const account = dbCocuyos.accounts.find((a) => a.tableId === tableId && a.status !== "cerrada") ?? null;
    return NextResponse.json({ ok: true, account });
  }
  const accountId = params.get("accountId") ?? "";
  if (!accountId) return NextResponse.json({ error: "Falta la cuenta" }, { status: 400 });
  if (hasPostgres) {
    const account = await getAccountWithItems(accountId);
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, account });
  }
  const account = dbCocuyos.accounts.find((a) => a.id === accountId);
  if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true, account });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // Pagar: lo pide el comensal desde su mesa. Tarjeta (terminal) o
  // efectivo (con el billete/cantidad, para calcular el cambio en caja).
  if (body?.action === "pay") {
    const accountId = String(body.accountId ?? "");
    const method = body.method as "terminal" | "efectivo";
    if (!accountId || (method !== "terminal" && method !== "efectivo"))
      return NextResponse.json({ error: "Falta la cuenta o el método de pago" }, { status: 400 });
    const cashCents = method === "efectivo" ? Number(body.cashCents) || 0 : undefined;
    if (hasPostgres) {
      const account = await getAccountWithItems(accountId);
      if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      if (method === "efectivo" && (cashCents ?? 0) < account.totalCents)
        return NextResponse.json({ error: `El efectivo no cubre el total de ${account.totalCents / 100}` }, { status: 400 });
      const paid = await setAccountPayment(accountId, method, cashCents);
      const change = method === "efectivo" ? (cashCents ?? 0) - (paid?.totalCents ?? 0) : 0;
      return NextResponse.json({ ok: true, account: paid, changeCents: change });
    }
    const account = dbCocuyos.accounts.find((a) => a.id === accountId);
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    if (method === "efectivo" && (cashCents ?? 0) < account.totalCents)
      return NextResponse.json({ error: "El efectivo no cubre el total" }, { status: 400 });
    account.status = "cuenta-pedida";
    account.payment = { method, cashCents };
    const change = method === "efectivo" ? (cashCents ?? 0) - account.totalCents : 0;
    return NextResponse.json({ ok: true, account, changeCents: change });
  }

  // Crear pedido: el comensal manda SOLO ids (nunca nombres ni
  // precios). El servidor busca cada id en COCUYOS_MENU y toma de ahí
  // el nombre, el precio y la estación. Un id con precio por confirmar
  // (priceCents null) se rechaza con 400: se muestra, no se pide.
  if (!body?.tableId || !Array.isArray(body.items) || body.items.length === 0)
    return NextResponse.json({ error: "Falta mesa o platillos" }, { status: 400 });
  const table = COCUYOS_TABLES.find((t) => t.id === body.tableId);
  if (!table) return NextResponse.json({ error: "Mesa no válida. Pide solo con el QR de tu mesa." }, { status: 400 });
  const items: { name: string; priceCents: number; station: "cocina" | "barra"; notes: string | null; qty: number }[] = [];
  for (const raw of body.items as { id?: number; qty?: number; notes?: string }[]) {
    const menuItem = cocuyosItemById(Number(raw?.id));
    if (!menuItem) return NextResponse.json({ error: `Platillo no válido (id ${raw?.id})` }, { status: 400 });
    if (menuItem.priceCents === null)
      return NextResponse.json({ error: `Precio por confirmar: ${menuItem.nameEs}` }, { status: 400 });
    items.push({
      name: menuItem.nameEs,
      priceCents: menuItem.priceCents,
      station: menuItem.station,
      notes: String(raw?.notes ?? "").trim() || null,
      qty: Math.max(1, Math.floor(Number(raw?.qty) || 1)),
    });
  }
  if (hasPostgres) {
    const account = await getOrCreateAccount(table.id);
    const updated = await addOrderItems(account.id, items);
    return NextResponse.json({ ok: true, accountId: updated.id, tableLabel: updated.tableLabel, totalCents: updated.totalCents });
  }
  let account = dbCocuyos.accounts.find((a) => a.tableId === table.id && a.status !== "cerrada");
  if (!account) {
    account = { id: `acc-${Date.now()}`, tableId: table.id, tableLabel: table.label, items: [], totalCents: 0, status: "abierta", createdAt: new Date().toISOString() } as Account;
    dbCocuyos.accounts.push(account);
  }
  for (const it of items) {
    // Todo va directo a cocina/barra con estado "pendiente": no hay
    // tiempos en espera en Cocuyos.
    account.items.push({ id: newCocuyosItemId(), name: it.name, priceCents: it.priceCents, kitchen: it.station, station: it.station, status: "pendiente", qty: it.qty, notes: it.notes });
  }
  account.totalCents = accountTotal(account.items);
  return NextResponse.json({ ok: true, accountId: account.id, tableLabel: account.tableLabel, totalCents: account.totalCents });
}
