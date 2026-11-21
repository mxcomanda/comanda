import { NextResponse } from "next/server";
import { db, newItemId, accountTotal } from "@/lib/store";
import type { Account } from "@/lib/types";
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body?.tableId || !Array.isArray(body.items) || body.items.length === 0)
    return NextResponse.json({ error: "Falta mesa o platillos" }, { status: 400 });
  const table = db.tables.find((t) => t.id === body.tableId);
  if (!table) return NextResponse.json({ error: "Mesa no válida. Pide solo con el QR de tu mesa." }, { status: 400 });
  let account = db.accounts.find((a) => a.tableId === table.id && a.status !== "cerrada");
  if (!account) {
    account = { id: `acc-${Date.now()}`, tableId: table.id, tableLabel: table.label, items: [], totalCents: 0, status: "abierta", createdAt: new Date().toISOString() } as Account;
    db.accounts.push(account);
  }
  for (const it of body.items) {
    // Los tiempos del menú van en "espera": NO aparecen en cocina hasta que el
    // comensal los pide en orden (1º, 2º, 3º) con /api/dzib/course.
    const isCourse = Boolean(it.tiempo);
    account.items.push({ id: newItemId(), name: String(it.name), priceCents: Number(it.priceCents) || 0, kitchen: "cocina-a", tiempo: it.tiempo ?? null, status: isCourse ? "espera" : "pendiente", qty: 1 });
  }
  account.totalCents = accountTotal(account.items);
  return NextResponse.json({ ok: true, accountId: account.id, tableLabel: account.tableLabel, totalCents: account.totalCents });
}
