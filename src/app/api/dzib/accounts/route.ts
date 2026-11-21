import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { verifySession } from "@/lib/auth";
import { db, accountTotal } from "@/lib/store";
import { hasPostgres, getAllAccounts, getAccountWithItems, setItemStatus, setAccountStatus, closeAccountByMesero, setChangeReady, setKitchenAlert, getDayData, saveDayCut } from "@/lib/pg";
import { computeDaySummary, mexicoDateString, type DayCut } from "@/lib/daySummary";

function roleOf(req: Request) {
  return verifySession(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "dzib");
}

export async function GET(req: Request) {
  const role = roleOf(req);
  if (role !== "mesero" && role !== "caja")
    return NextResponse.json({ error: "Tu rol no tiene acceso a Meseros / cuentas" }, { status: 403 });
  if (hasPostgres) {
    const accounts = await getAllAccounts();
    if (role === "caja") {
      const { summary, cut } = await getDayData();
      return NextResponse.json({ role, accounts, summary, cut });
    }
    return NextResponse.json({ role, accounts });
  }
  if (role === "caja") {
    const date = mexicoDateString();
    const summary = computeDaySummary(db.accounts, date);
    const cut = db.dayCuts.find((c) => c.date === date) ?? null;
    return NextResponse.json({ role, accounts: db.accounts, summary, cut });
  }
  return NextResponse.json({ role, accounts: db.accounts });
}

// Acciones del personal sobre las cuentas. Meseros: marcar entregado y
// avisar a cocina. Caja: confirmar pago, marcar cambio listo, cerrar cuenta.
export async function POST(req: Request) {
  const role = roleOf(req);
  if (role !== "mesero" && role !== "caja")
    return NextResponse.json({ error: "Tu rol no tiene acceso a Meseros / cuentas" }, { status: 403 });
  const body = await req.json().catch(() => null);
  const action = body?.action as string;

  // Corte final del día (solo Caja, sin accountId): revisa el resumen,
  // cierra las cuentas abiertas del día, marca el día como cortado y
  // guarda el corte con fecha, hora y totales.
  if (action === "corte") {
    if (role !== "caja") return NextResponse.json({ error: "Solo Caja puede hacer el corte" }, { status: 403 });
    if (hasPostgres) {
      const res = await saveDayCut();
      if ("error" in res) return NextResponse.json({ error: res.error, cut: res.cut ?? null }, { status: 400 });
      return NextResponse.json({ ok: true, cut: res.cut });
    }
    const date = mexicoDateString();
    const existing = db.dayCuts.find((c) => c.date === date);
    if (existing) return NextResponse.json({ error: "Ya se hizo el corte de hoy.", cut: existing }, { status: 400 });
    const summary = computeDaySummary(db.accounts, date);
    // Las abiertas se cierran en el corte; las que ya estaban cerradas
    // sin cobrar también quedan registradas como pendientes sin cobrar.
    const openClosed = [...summary.openAccounts, ...summary.closedUnpaid];
    for (const o of openClosed) {
      const a = db.accounts.find((x) => x.id === o.accountId);
      if (a) a.status = "cerrada";
    }
    for (const a of db.accounts) {
      if (a.createdAt && mexicoDateString(new Date(a.createdAt)) === date && !a.cutDate) a.cutDate = date;
    }
    const cut: DayCut = { ...summary, id: `cut-${Date.now()}`, closedAt: new Date().toISOString(), openAccountsClosed: openClosed };
    db.dayCuts.push(cut);
    return NextResponse.json({ ok: true, cut });
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
    for (const a of db.accounts) {
      const it = a.items.find((i) => i.id === body.itemId);
      if (it) { it.status = "entregado"; a.totalCents = accountTotal(a.items); return NextResponse.json({ ok: true }); }
    }
    return NextResponse.json({ error: "Platillo no encontrado" }, { status: 404 });
  }

  if (action === "call-kitchen") {
    if (hasPostgres) { await setKitchenAlert(accountId, true); return NextResponse.json({ ok: true, message: "Cocina avisada." }); }
    const acc = db.accounts.find((a) => a.id === accountId);
    if (acc) (acc as any).kitchenAlert = true;
    return NextResponse.json({ ok: true, message: "Cocina avisada." });
  }

  // Cierre por el mesero ("Liberar mesa"): el mesero cierra la cuenta de
  // su mesa para que entren nuevos comensales. La mesa queda libre y
  // caja recibe el aviso (closedByMesero). Si hay platillos sin entregar
  // o la cuenta no está pagada, el cliente pide confirmación antes de
  // llamar aquí; el servidor no bloquea el cierre, solo lo registra.
  if (action === "close" && role === "mesero") {
    if (hasPostgres) {
      const acc = await closeAccountByMesero(accountId);
      if (!acc) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      return NextResponse.json({ ok: true, account: acc });
    }
    const a = db.accounts.find((x) => x.id === accountId);
    if (!a) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    a.status = "cerrada";
    (a as any).closedByMesero = true;
    return NextResponse.json({ ok: true, account: a });
  }

  // Solo Caja a partir de aquí.
  if (role !== "caja") return NextResponse.json({ error: "Solo Caja puede hacer eso" }, { status: 403 });
  if (action === "confirm-pay") {
    const acc = hasPostgres ? await setAccountStatus(accountId, "pagada") : null;
    if (!hasPostgres) {
      const a = db.accounts.find((x) => x.id === accountId);
      if (!a) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      a.status = "pagada";
      return NextResponse.json({ ok: true, account: a });
    }
    if (!acc) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, account: acc });
  }
  if (action === "change-ready") {
    const ready = body?.ready !== false;
    const acc = hasPostgres ? await setChangeReady(accountId, ready) : null;
    if (!hasPostgres) {
      const a = db.accounts.find((x) => x.id === accountId);
      if (!a) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      (a as any).changeReady = ready;
      return NextResponse.json({ ok: true, account: a });
    }
    if (!acc) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, account: acc });
  }
  if (action === "close") {
    const acc = hasPostgres ? await setAccountStatus(accountId, "cerrada") : null;
    if (!hasPostgres) {
      const a = db.accounts.find((x) => x.id === accountId);
      if (!a) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
      a.status = "cerrada";
      return NextResponse.json({ ok: true, account: a });
    }
    if (!acc) return NextResponse.json({ error: "Cuenta no encontrada" }, { status: 404 });
    return NextResponse.json({ ok: true, account: acc });
  }
  return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
}
