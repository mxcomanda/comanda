import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db, newItemId, accountTotal } from "@/lib/store";
import { DZIB_TABLES } from "@/data/dzib";
import { hasPostgres, getOrCreateAccount, getOpenAccountByTable, getAccountWithItems, addOrderItems, setAccountPayment, setItemNotes } from "@/lib/pg";
import type { Account } from "@/lib/types";

// Estado de una cuenta (lo usa el comensal para su panel de Status y el
// mesero). El id es un UUID, no lleva sesión de personal.
// GET ?accountId=… → una cuenta por id.
// GET ?tableId=N → la cuenta ABIERTA de esa mesa (para que el pedido no
// se pierda al cambiar de dispositivo: cualquier celular con el QR de la
// mesa ve la misma cuenta y el mismo status, porque la fuente de verdad
// es Postgres, no el navegador).
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const tableId = Number(params.get("tableId") ?? "");
  if (tableId) {
    if (hasPostgres) {
      const account = await getOpenAccountByTable(tableId);
      return NextResponse.json({ ok: true, account });
    }
    const account = db.accounts.find((a) => a.tableId === tableId && a.status !== "cerrada") ?? null;
    return NextResponse.json({ ok: true, account });
  }
  const accountId = params.get("accountId") ?? "";
  if (!accountId) return NextResponse.json({ error: "Falta la cuenta" }, { status: 400 });
  if (hasPostgres) {
    const account = await getAccountWithItems(accountId);
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, account });
  }
  const account = db.accounts.find((a) => a.id === accountId);
  if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  return NextResponse.json({ ok: true, account });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  // Actualizar las indicaciones especiales de un platillo que todavía
  // está en espera (el comensal aún no pidió ese tiempo).
  if (body?.action === "notes") {
    const itemId = String(body.itemId ?? "");
    const notes = String(body.notes ?? "");
    if (!itemId) return NextResponse.json({ error: "Falta el platillo" }, { status: 400 });
    if (hasPostgres) {
      const ok = await setItemNotes(itemId, notes);
      if (!ok) return NextResponse.json({ error: "Ya no se puede cambiar la indicación de ese platillo" }, { status: 400 });
      return NextResponse.json({ ok: true });
    }
    for (const a of db.accounts) {
      const it = a.items.find((i) => i.id === itemId);
      if (it) {
        if (it.status !== "espera") return NextResponse.json({ error: "Ya no se puede cambiar la indicación de ese platillo" }, { status: 400 });
        it.notes = notes.trim() || null;
        return NextResponse.json({ ok: true });
      }
    }
    return NextResponse.json({ error: "Platillo no encontrado" }, { status: 404 });
  }

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
    const account = db.accounts.find((a) => a.id === accountId);
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    if (method === "efectivo" && (cashCents ?? 0) < account.totalCents)
      return NextResponse.json({ error: "El efectivo no cubre el total" }, { status: 400 });
    account.status = "cuenta-pedida";
    account.payment = { method, cashCents };
    const change = method === "efectivo" ? (cashCents ?? 0) - account.totalCents : 0;
    return NextResponse.json({ ok: true, account, changeCents: change });
  }

  if (!body?.tableId || !Array.isArray(body.items) || body.items.length === 0)
    return NextResponse.json({ error: "Falta mesa o platillos" }, { status: 400 });
  const table = DZIB_TABLES.find((t) => t.id === body.tableId);
  if (!table) return NextResponse.json({ error: "Mesa no válida. Pide solo con el QR de tu mesa." }, { status: 400 });
  const items = body.items.map((it: { name: string; priceCents: number; tiempo?: string | null; corrida?: number | null; notes?: string | null; detail?: string | null; group?: string | null }) => ({
    name: String(it.name), priceCents: Number(it.priceCents) || 0, tiempo: it.tiempo ?? null,
    corrida: it.tiempo ? (Number(it.corrida) || 1) : null,
    notes: String(it.notes ?? "").trim() || null, detail: String(it.detail ?? "").trim() || null,
    group: it.group === "desayuno" ? "desayuno" as const : null,
  }));
  if (hasPostgres) {
    const account = await getOrCreateAccount(table.id);
    const updated = await addOrderItems(account.id, items);
    return NextResponse.json({ ok: true, accountId: updated.id, tableLabel: updated.tableLabel, totalCents: updated.totalCents });
  }
  let account = db.accounts.find((a) => a.tableId === table.id && a.status !== "cerrada");
  if (!account) {
    account = { id: `acc-${Date.now()}`, tableId: table.id, tableLabel: table.label, items: [], totalCents: 0, status: "abierta", createdAt: new Date().toISOString() } as Account;
    db.accounts.push(account);
  }
  for (const it of items) {
    // Los tiempos del menú van en "espera": NO aparecen en cocina hasta que el
    // comensal los pide en orden (1º, 2º, 3º) con /api/dzib/course.
    const isCourse = Boolean(it.tiempo);
    account.items.push({ id: newItemId(), name: it.name, priceCents: it.priceCents, kitchen: "cocina-a", tiempo: it.tiempo, corrida: it.corrida, status: isCourse ? "espera" : "pendiente", qty: 1, notes: it.notes, detail: it.detail, group: it.group });
  }
  account.totalCents = accountTotal(account.items);
  return NextResponse.json({ ok: true, accountId: account.id, tableLabel: account.tableLabel, totalCents: account.totalCents });
}
