// Caja de Los Cocuyos: todas las cuentas con su total, método de pago,
// efectivo y cambio, y el flujo de cobro: Caja señala Tarjeta o Efectivo
// (y con tarjeta la propina) y SOLO DESPUÉS aparece "Cerrar cuenta",
// que cierra la cuenta con su método y su propina y libera la mesa.
// Solo Caja libera mesas: los meseros ya no cierran cuentas. Se
// actualiza cada 5 s. Además: resumen del día por mesa (con las
// propinas separadas) y corte final del día (solo rol Caja).
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { STATUS_LABEL, mxn } from "@/lib/types";
import { mexicoTimeString } from "@/lib/daySummary";
import { useStaffAlerts, StaffAlertUI, type StaffEvent } from "@/app/dzib/StaffAlerts";

export default function CajaView() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [showCutReview, setShowCutReview] = useState(false);
  const [cutBusy, setCutBusy] = useState(false);
  const [cajaMethod, setCajaMethod] = useState<Record<string, "terminal" | "efectivo">>({});
  const [cajaTip, setCajaTip] = useState<Record<string, string>>({});
  const staffAlerts = useStaffAlerts();
  function load() {
    fetch("/api/cocuyos/accounts").then(async (r) => {
      if (!r.ok) { setErr("Sin acceso: entra primero con tu clave en /cocuyos/personal"); return; }
      setErr(""); setData(await r.json());
    }).catch(() => setErr("No se pudieron cargar las cuentas"));
  }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  async function post(action: string, body: any) {
    const res = await fetch("/api/cocuyos/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
    const d = await res.json().catch(() => null);
    setMsg(res.ok ? "Listo." : (d?.error ?? "No se pudo hacer"));
    load();
  }
  const accounts = data?.accounts ?? [];
  const summary = data?.summary;
  const cut = data?.cut;
  const isCaja = data?.role === "caja";
  const allDelivered = (a: any) => (a.items?.length ?? 0) > 0 && a.items.every((i: any) => i.status === "entregado" || i.status === "cancelado");
  async function cerrarConPago(a: any) {
    const method = cajaMethod[a.id];
    if (!method) return;
    const tipCents = method === "terminal" ? Math.max(0, Math.round(Number(cajaTip[a.id] ?? "0") * 100)) : 0;
    const res = await fetch("/api/cocuyos/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "close-paid", accountId: a.id, method, tipCents }) });
    const d = await res.json().catch(() => null);
    setMsg(res.ok ? "Cuenta cerrada y mesa liberada." : (d?.error ?? "No se pudo cerrar la cuenta"));
    if (res.ok) {
      setCajaMethod((prev) => { const n = { ...prev }; delete n[a.id]; return n; });
      setCajaTip((prev) => { const n = { ...prev }; delete n[a.id]; return n; });
    }
    load();
  }
  async function hacerCorte() {
    if (!window.confirm("¿Seguro que quieres hacer el corte final del día?")) return;
    setCutBusy(true);
    const res = await fetch("/api/cocuyos/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "corte" }) });
    const d = await res.json().catch(() => null);
    setCutBusy(false);
    if (!res.ok) { setMsg(d?.error ?? "No se pudo hacer el corte"); return; }
    setMsg("Corte final del día guardado.");
    setShowCutReview(false);
    load();
  }
  useEffect(() => {
    if (!data) return;
    const events: StaffEvent[] = accounts
      .filter((a: any) => a.status === "cuenta-pedida")
      .map((a: any) => {
        const change = a.payment?.method === "efectivo" ? (a.payment.cashCents ?? 0) - a.totalCents : 0;
        const method = a.payment?.method === "efectivo"
          ? `Efectivo con $${((a.payment.cashCents ?? 0) / 100).toFixed(0)} · cambio $${(change / 100).toFixed(0)}`
          : "Tarjeta (terminal)";
        return { key: `cuenta:${a.id}`, text: `¡${a.tableLabel} pidió la cuenta! Total $${(a.totalCents / 100).toFixed(0)} · ${method}` };
      });
    const freed: StaffEvent[] = accounts
      .filter((a: any) => a.closedByMesero && a.status === "cerrada")
      .map((a: any) => ({ key: `mesa-cerrada:${a.id}`, text: `¡${a.tableLabel} cerrada por el mesero — lista para nuevos comensales!` }));
    staffAlerts.notify([...events, ...freed]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  return (
    <div className="dzib cocuyos">
    <main className="wrap">
      <p style={{ margin: "0 0 4px" }}><Image src="/los-cocuyos-logo.svg" alt="Taquería Los Cocuyos" width={64} height={64} /></p>
      <h2>Los Cocuyos — Caja</h2>
      <p className="muted">Todas las cuentas. Caja ve todo: cocina, meseros y cuentas. Se actualiza cada 5 segundos.</p>
      <StaffAlertUI alerts={staffAlerts} />
      <p><button onClick={load}>Actualizar</button> <a href="/cocuyos/cocina">Ver cocina</a> · <a href="/cocuyos/meseros">Ver meseros</a></p>
      {msg && <p>{msg}</p>}
      {err ? <p className="danger">{err}</p> : accounts.length === 0 ? <p className="muted">No hay cuentas.</p> : accounts.map((a: any) => {
        const change = a.payment?.method === "efectivo" ? (a.payment.cashCents ?? 0) - a.totalCents : 0;
        return (
          <div className="card" key={a.id} style={{ marginBottom: 12 }}>
            <b>{a.tableLabel}</b> — {a.status} — Total: ${(a.totalCents / 100).toFixed(0)}
            {a.payment ? (
              <div className="muted">
                Pago: {a.payment.method === "efectivo"
                  ? `Efectivo — paga con $${(a.payment.cashCents ?? 0) / 100} · Cambio a llevar: $${(change / 100).toFixed(0)}${a.changeReady ? " · Cambio listo ✓ (mesero avisado)" : " · Cambio pendiente"}`
                  : "Tarjeta (terminal)"}
              </div>
            ) : <div className="muted">Sin pagar todavía.</div>}
            {a.closedByMesero && <div className="muted">🔓 Liberada por el mesero — lista para nuevos comensales.</div>}
            {(a.tipCents ?? 0) > 0 && <div className="muted">💰 Propina: ${(a.tipCents / 100).toFixed(0)}</div>}
            {a.items?.map((i: any) => (
              <div key={i.id}>
                <div className="item"><span>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ""} <span className="muted">· {i.station === "barra" ? "Barra" : "Cocina"}</span></span><span>{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</span></div>
                {i.notes && <div className="notes-box">⚠ Indicaciones: {i.notes}</div>}
              </div>
            ))}
            <p>
              {a.payment?.method === "efectivo" && a.status !== "cerrada" && (
                <button type="button" className="staff-btn" onClick={() => post("change-ready", { accountId: a.id, ready: !a.changeReady })}>{a.changeReady ? "Quitar cambio listo" : "Marcar cambio listo"}</button>
              )}
            </p>
            {a.status !== "cerrada" && (a.status === "cuenta-pedida" || (a.status === "abierta" && allDelivered(a))) && (
              <div className="card" style={{ marginTop: 10 }}>
                <b>Cobrar y cerrar cuenta</b>
                <p className="muted">Señala el método de pago. Solo después aparece el botón de cerrar cuenta y se libera la mesa.</p>
                <div className="pay-row">
                  <button type="button" className={cajaMethod[a.id] === "terminal" ? "active" : ""} onClick={() => { setCajaMethod((prev) => ({ ...prev, [a.id]: "terminal" })); setCajaTip((prev) => ({ ...prev, [a.id]: prev[a.id] ?? "0" })); }}>💳 Tarjeta</button>
                  <button type="button" className={cajaMethod[a.id] === "efectivo" ? "active" : ""} onClick={() => setCajaMethod((prev) => ({ ...prev, [a.id]: "efectivo" }))}>💵 Efectivo</button>
                </div>
                {!cajaMethod[a.id] && a.payment?.method && <p className="muted">El comensal eligió: {a.payment.method === "terminal" ? "Tarjeta (terminal)" : "Efectivo"} — confírmalo pulsando el botón.</p>}
                {cajaMethod[a.id] === "terminal" && (
                  <label>Propina
                    <input inputMode="decimal" placeholder="0" value={cajaTip[a.id] ?? "0"} onChange={(e) => setCajaTip((prev) => ({ ...prev, [a.id]: e.target.value }))} />
                  </label>
                )}
                {cajaMethod[a.id] && (
                  <p><button type="button" className="big-btn green" onClick={() => cerrarConPago(a)}>Cerrar cuenta</button></p>
                )}
              </div>
            )}
          </div>
        );
      })}
      <p><a href="/cocuyos">Volver al menú</a> · <a href="/cocuyos/personal">Personal</a></p>

      {isCaja && summary && (
        <div className="card" style={{ marginBottom: 12 }}>
          <b>Resumen del día — {summary.date}</b>
          {cut && <p className="muted">Corte hecho a las {mexicoTimeString(cut.closedAt)} (hora de México). El conteo empezó de nuevo en ceros; el detalle del corte está abajo.</p>}
          <div className="item"><span>Total de pedidos hoy</span><b>{summary.totalOrders}</b></div>
          <div className="item"><span>Total ganado hoy</span><b>{mxn(summary.totalCents)}</b></div>
          <div className="item"><span>Efectivo</span><span>{mxn(summary.cashCents)}</span></div>
          <div className="item"><span>Tarjeta (terminal)</span><span>{mxn(summary.cardCents)}</span></div>
          <div className="item"><span>Propinas (tarjeta)</span><span>{mxn(summary.tipCents ?? 0)}</span></div>
          {summary.unclassifiedCents > 0 && <div className="item"><span>Sin método registrado</span><span>{mxn(summary.unclassifiedCents)}</span></div>}
          <h3>Por mesa</h3>
          {summary.perTable.map((t: any) => (
            <div className="item" key={t.tableId}><span>{t.tableLabel}</span><span>{t.orders} pedido{t.orders === 1 ? "" : "s"} · {mxn(t.totalCents)}</span></div>
          ))}
          {summary.openAccounts.length > 0 && (
            <p className="danger">Cuentas abiertas hoy (sin cerrar): {summary.openAccounts.map((o: any) => `${o.tableLabel} (${mxn(o.totalCents)})`).join(", ")} — no cuentan en el total ganado hasta que se paguen.</p>
          )}
          {summary.closedUnpaid?.length > 0 && (
            <p className="danger">Cerradas sin cobrar (no están en el total ganado): {summary.closedUnpaid.map((o: any) => `${o.tableLabel} (${mxn(o.totalCents)})`).join(", ")}</p>
          )}
        </div>
      )}

      {isCaja && (
        <div className="card" style={{ marginTop: 16 }}>
          <b>Corte final del día</b>
          {cut ? (
            <>
              <p>✓ Corte del {cut.date} hecho a las {mexicoTimeString(cut.closedAt)} (hora de México).</p>
              <div className="item"><span>Total de pedidos</span><b>{cut.totalOrders}</b></div>
              <div className="item"><span>Total ganado</span><b>{mxn(cut.totalCents)}</b></div>
              <div className="item"><span>Efectivo</span><span>{mxn(cut.cashCents)}</span></div>
              <div className="item"><span>Tarjeta (terminal)</span><span>{mxn(cut.cardCents)}</span></div>
              <div className="item"><span>Propinas (tarjeta)</span><span>{mxn(cut.tipCents ?? 0)}</span></div>
              {cut.unclassifiedCents > 0 && <div className="item"><span>Sin método registrado</span><span>{mxn(cut.unclassifiedCents)}</span></div>}
              <h3>Por mesa</h3>
              {cut.perTable.map((t: any) => (
                <div className="item" key={t.tableId}><span>{t.tableLabel}</span><span>{t.orders} pedido{t.orders === 1 ? "" : "s"} · {mxn(t.totalCents)}</span></div>
              ))}
              {cut.openAccountsClosed?.length > 0 && (
                <p className="danger">Cuentas que estaban abiertas y se cerraron en el corte sin cobrar: {cut.openAccountsClosed.map((o: any) => `${o.tableLabel} (${mxn(o.totalCents)})`).join(", ")}. Su dinero no está en el total ganado.</p>
              )}
              <p className="muted">El resumen del día ya empezó de nuevo en ceros. El historial de este corte queda guardado.</p>
            </>
          ) : (
            <>
              <p className="muted">Revisa el resumen del día y haz el corte cuando cierres. Las cuentas abiertas se cerrarán en el corte y quedarán registradas como pendientes sin cobrar.</p>
              {!showCutReview ? (
                <button type="button" className="big-btn" onClick={() => setShowCutReview(true)}>Corte final del día</button>
              ) : (
                <>
                  <p><b>Revisa antes de confirmar:</b> {summary ? `${summary.totalOrders} pedidos · ${mxn(summary.totalCents)} ganados · Efectivo ${mxn(summary.cashCents)} · Tarjeta ${mxn(summary.cardCents)} · Propinas ${mxn(summary.tipCents ?? 0)}` : "sin datos"}</p>
                  {summary?.perTable?.map((t: any) => (
                    <div className="item" key={t.tableId}><span>{t.tableLabel}</span><span>{t.orders} pedido{t.orders === 1 ? "" : "s"} · {mxn(t.totalCents)}</span></div>
                  ))}
                  {summary?.openAccounts?.length > 0 && (
                    <p className="danger">Estas cuentas están abiertas y se cerrarán en el corte sin cobrar: {summary.openAccounts.map((o: any) => `${o.tableLabel} (${mxn(o.totalCents)})`).join(", ")}. Su dinero no está en el total ganado.</p>
                  )}
                  <p>
                    <button type="button" className="big-btn green" disabled={cutBusy} onClick={hacerCorte}>{cutBusy ? "Haciendo corte…" : "Confirmar corte final del día"}</button>{" "}
                    <button type="button" onClick={() => setShowCutReview(false)}>Cancelar</button>
                  </p>
                </>
              )}
            </>
          )}
        </div>
      )}
    </main>
    </div>
  );
}
