import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { verifySessionRoles, type Role } from "@/lib/auth";
import { dbCocuyos, accountTotal } from "@/lib/store-cocuyos";
import { hasPostgres, getAllAccounts, getAccountWithItems, setItemStatus, setAccountStatus, closeAccountPaid, getTipsBySide, setChangeReady, getDayData, saveDayCut, getOpenAssistanceCalls, attendAssistance } from "@/lib/pg-cocuyos";
import { computeDaySummary, mexicoDateString, type DayCut } from "@/lib/daySummary";
import { COCUYOS_TABLES } from "@/data/cocuyos";

function roleOf(req: Request): Role[] {
  return verifySessionRoles(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "cocuyos");
}

export async function GET(req: Request) {
  const roles = roleOf(req);
  const role = roles[0] ?? null;
  if (!roles.includes("mesero") && !roles.includes("caja"))
    return NextResponse.json({ error: "Tu rol no tiene acceso a Meseros / cuentas" }, { status: 403 });
  if (hasPostgres) {
    const accounts = await getAllAccounts();
    const assistance = await getOpenAssistanceCalls();
    const tips = await getTipsBySide();
    if (role === "caja") {
      const { summary, cut } = await getDayData();
      return NextResponse.json({ role, roles, accounts, assistance, tips, summary, cut });
    }
    return NextResponse.json({ role, roles, accounts, assistance, tips });
  }
  const date = mexicoDateString();
  const tips = { left: 0, right: 0 };
  for (const a of dbCocuyos.accounts) {
    if (!(a.tipCents ?? 0)) continue;
    if (a.cutDate) continue;
    if (a.createdAt && mexicoDateString(new Date(a.createdAt)) !== date) continue;
    if (a.tableId <= 5) tips.left += a.tipCents ?? 0; else tips.right += a.tipCents ?? 0;
  }
  if (role === "caja") {
    const summary = computeDaySummary(dbCocuyos.accounts, date, COCUYOS_TABLES);
    const cut = dbCocuyos.dayCuts.find((c) => c.date === date) ?? null;
    return NextResponse.json({ role, roles, accounts: dbCocuyos.accounts, assistance: dbCocuyos.assistance, tips, summary, cut });
  }
  return NextResponse.json({ role, roles, accounts: dbCocuyos.accounts, assistance: dbCocuyos.assistance, tips });
}

// Acciones del personal sobre las cuentas. Meseros: marcar entregado.
// Caja: confirmar pago, marcar cambio listo, cerrar cuenta con pago.
export async function POST(req: Request) {
  const roles = roleOf(req);
  const role = roles[0] ?? null;
  if (!roles.includes("mesero") && !roles.includes("caja"))
    return NextResponse.json({ error: "Tu rol no tiene acceso a Meseros / cuentas" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const action = body?.action as string;

  // Corte final del día (solo Caja, sin accountId).
  if (action === "corte") {
    if (!roles.includes("caja")) return NextResponse.json({ error: "Solo Caja puede hacer el corte" }, { status: 403 });
    if (hasPostgres) {
      const res = await saveDayCut();
      if ("error" in res) return NextResponse.json({ error: res.error, cut: res.cut ?? null }, { status: 400 });
      return NextResponse.json({ ok: true, cut: res.cut });
    }
    const date = mexicoDateString();
    const existing = dbCocuyos.dayCuts.find((c) => c.date === date);
    if (existing) return NextResponse.json({ error: "Ya se hizo el corte de hoy.", cut: existing }, { status: 400 });
    const summary = computeDaySummary(dbCocuyos.accounts, date, COCUYOS_TABLES);
    const openClosed = [...summary.openAccounts, ...summary.closedUnpaid];
    for (const o of openClosed) {
      const a = dbCocuyos.accounts.find((x) => x.id === o.accountId);
      if (a) a.status = "cerrada";
    }
    for (const a of dbCocuyos.accounts) {
      if (a.createdAt && mexicoDateString(new Date(a.createdAt)) === date && !a.cutDate) a.cutDate = date;
    }
    const cut: DayCut = { ...summary, id: `cut-${Date.now()}`, closedAt: new Date().toISOString(), openAccountsClosed: openClosed };
    dbCocuyos.dayCuts.push(cut);
    return NextResponse.json({ ok: true, cut });
  }

  // Asistencia al mesero (sin accountId): el mesero marca como atendida
  // la llamada del botón circular del comensal.
  if (action === "attend-assistance") {
    const callId = String(body?.callId ?? "");
    if (!callId) return NextResponse.json({ error: "Falta la llamada" }, { status: 400 });
    if (hasPostgres) {
      const ok = await attendAssistance(callId);
      if (!ok) return NextResponse.json({ error: "Llamada no encontrada o ya atendida" }, { status: 404 });
      return NextResponse.json({ ok: true, message: "Asistencia atendida." });
    }
    const idx = dbCocuyos.assistance.findIndex((c) => c.id === callId);
    if (idx < 0) return NextResponse.json({ error: "Llamada no encontrada o ya atendida" }, { status: 404 });
    dbCocuyos.assistance.splice(idx, 1);
    return NextResponse.json({ ok: true, message: "Asistencia atendida." });
  }

  const accountId = String(body?.accountId ?? "");
  if (!accountId) return NextResponse.json({ error: "Falta la cuenta" }, { status: 400 });

  if (action === "deliver") {
    if (!body?.itemId) return NextResponse.json({ error: "Falta el platillo" }, { status: 400 });
    if (hasPostgres) {
      const ok = await setItemStatus(String(body.itemId), "entregado");
      if (!ok) return NextResponse.json({ error: "Platillo no encontrado" }, { status: 404 });
      return NextResponse.json({ ok: true });
    }
    for (const a of dbCocuyos.accounts) {
      const it = a.items.find((i) => i.id === body.itemId);
      if (it) { it.status = "entregado"; a.totalCents = accountTotal(a.items); return NextResponse.json({ ok: true }); }
    }
    return NextResponse.json({ error: "Platillo no encontrado" }, { status: 404 });
  }

  // Solo Caja a partir de aquí.
  if (!roles.includes("caja")) return NextResponse.json({ error: "Solo Caja puede hacer eso" }, { status: 403 });
  if (action === "confirm-pay") {
    const acc = hasPostgres ? await setAccountStatus(accountId, "pagada") : null;
    if (!hasPostgres) {
      const a = dbCocuyos.accounts.find((x) => x.id === accountId);
      if (!a) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      a.status = "pagada";
      return NextResponse.json({ ok: true, account: a });
    }
    if (!acc) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, account: acc });
  }
  // Cierre CON PAGO por Caja (única forma de liberar una mesa): Caja ya
  // señaló el método (Tarjeta o Efectivo) y, con tarjeta, la propina.
  if (action === "close-paid") {
    const method = body?.method as "terminal" | "efectivo";
    if (method !== "terminal" && method !== "efectivo")
      return NextResponse.json({ error: "Falta el método de pago (Tarjeta o Efectivo)" }, { status: 400 });
    const tipCents = method === "terminal" ? Math.max(0, Math.floor(Number(body?.tipCents) || 0)) : 0;
    if (hasPostgres) {
      const acc = await closeAccountPaid(accountId, method, tipCents);
      if (!acc) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      return NextResponse.json({ ok: true, account: acc });
    }
    const a = dbCocuyos.accounts.find((x) => x.id === accountId);
    if (!a) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    a.payment = { method, cashCents: method === "efectivo" ? a.payment?.cashCents : undefined };
    a.tipCents = tipCents;
    a.status = "cerrada";
    return NextResponse.json({ ok: true, account: a });
  }
  if (action === "change-ready") {
    const ready = body?.ready !== false;
    const acc = hasPostgres ? await setChangeReady(accountId, ready) : null;
    if (!hasPostgres) {
      const a = dbCocuyos.accounts.find((x) => x.id === accountId);
      if (!a) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      (a as any).changeReady = ready;
      return NextResponse.json({ ok: true, account: a });
    }
    if (!acc) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, account: acc });
  }
  if (action === "close-caja" || action === "close") {
    const acc = hasPostgres ? await setAccountStatus(accountId, "cerrada") : null;
    if (!hasPostgres) {
      const a = dbCocuyos.accounts.find((x) => x.id === accountId);
      if (!a) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      a.status = "cerrada";
      return NextResponse.json({ ok: true, account: a });
    }
    if (!acc) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, account: acc });
  }
  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
