import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { verifySession } from "@/lib/auth";
import { db, accountTotal } from "@/lib/store";
import { hasPostgres, getAllAccounts, getAccountWithItems, setItemStatus, setAccountStatus, setChangeReady, setKitchenAlert } from "@/lib/pg";

function roleOf(req: Request) {
  return verifySession(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "dzib");
}

export async function GET(req: Request) {
  const role = roleOf(req);
  if (role !== "mesero" && role !== "caja")
    return NextResponse.json({ error: "Tu rol no tiene acceso a Meseros / cuentas" }, { status: 403 });
  if (hasPostgres) {
    const accounts = await getAllAccounts();
    return NextResponse.json({ role, accounts });
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
