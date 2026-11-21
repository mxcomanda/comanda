import { NextResponse } from "next/server";
import { db, accountTotal } from "@/lib/store";
import { hasPostgres, getAccountWithItems, requestCourse } from "@/lib/pg";

const ORDER = ["primero", "segundo", "tercero"] as const;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const tiempo = body?.tiempo as (typeof ORDER)[number];
  if (!ORDER.includes(tiempo)) return NextResponse.json({ error: "Tiempo no válido" }, { status: 400 });
  if (hasPostgres) {
    const account = await getAccountWithItems(String(body?.accountId ?? ""));
    if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    const result = await requestCourse(account.id, tiempo);
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ ok: true, message: "¡Una mesa pidió su tiempo! Avisado a cocina y mesero.", items: result.items });
  }
  const account = db.accounts.find((a) => a.id === body?.accountId && a.status !== "cerrada");
  if (!account) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
  const idx = ORDER.indexOf(tiempo);
  // Secuencia estricta: no se puede pedir el 2º sin el 1º, ni el 3º sin el 2º.
  for (let i = 0; i < idx; i++) {
    const prev = account.items.filter((it) => it.tiempo === ORDER[i]);
    if (prev.length > 0 && prev.every((it) => it.status === "espera"))
      return NextResponse.json({ error: `Primero pide el ${ORDER[i]} tiempo` }, { status: 400 });
  }
  const items = account.items.filter((it) => it.tiempo === tiempo && it.status === "espera");
  if (items.length === 0) return NextResponse.json({ error: "No hay platillos en espera para ese tiempo" }, { status: 400 });
  items.forEach((it) => { it.status = "pendiente"; });
  account.totalCents = accountTotal(account.items);
  return NextResponse.json({ ok: true, message: "¡Una mesa pidió su tiempo! Avisado a cocina y mesero.", items: items.map((i) => i.name) });
}
