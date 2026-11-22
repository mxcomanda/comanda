// /api/dzib/assistance — botón circular "Asistencia mesero" del comensal.
// POST { tableId } (público, sin sesión: el comensal solo tiene el QR de
// su mesa): crea una llamada de asistencia, o devuelve la pendiente que
// ya tenga esa mesa (sin duplicar). GET ?tableId=N (público): devuelve
// la llamada pendiente de esa mesa, o null, para que el botón sepa si el
// mesero ya va en camino. La atención (marcar "atendido") la hace el
// mesero desde /api/dzib/accounts (acción attend-assistance).
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/store";
import { DZIB_TABLES } from "@/data/dzib";
import { hasPostgres, requestAssistance, getOpenAssistanceCallForTable, type AssistanceCall } from "@/lib/pg";

function validTable(tableId: number): boolean {
  return DZIB_TABLES.some((t) => t.id === tableId);
}

function memRequestAssistance(tableId: number): AssistanceCall {
  const label = DZIB_TABLES.find((t) => t.id === tableId)?.label ?? `Mesa ${tableId}`;
  const open = db.assistance.find((c) => c.tableId === tableId);
  if (open) return open;
  const call: AssistanceCall = { id: `as-${Date.now()}-${db.assistance.length}`, tableId, tableLabel: label, createdAt: new Date().toISOString() };
  db.assistance.push(call);
  return call;
}

export async function GET(req: Request) {
  const tableId = Number(new URL(req.url).searchParams.get("tableId"));
  if (!validTable(tableId)) return NextResponse.json({ error: "Mesa no válida" }, { status: 400 });
  const call = hasPostgres ? await getOpenAssistanceCallForTable(tableId) : (db.assistance.find((c) => c.tableId === tableId) ?? null);
  return NextResponse.json({ call });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const tableId = Number(body?.tableId);
  if (!validTable(tableId)) return NextResponse.json({ error: "Mesa no válida" }, { status: 400 });
  const call = hasPostgres ? await requestAssistance(tableId) : memRequestAssistance(tableId);
  return NextResponse.json({ ok: true, call });
}
