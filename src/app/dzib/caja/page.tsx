"use client";
import { useEffect, useState } from "react";
import { STATUS_LABEL, mxn } from "@/lib/types";
import { mexicoTimeString } from "@/lib/daySummary";
import { useStaffAlerts, StaffAlertUI, type StaffEvent } from "../StaffAlerts";

// Caja: todas las cuentas con su total, método de pago, efectivo y cambio,
// y botones para confirmar el pago, marcar el cambio listo (avisa al
// mesero) y cerrar la cuenta. Se actualiza cada 5 s. Además: resumen del
// día por mesa y corte final del día (solo rol Caja).
export default function CajaView() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [showCutReview, setShowCutReview] = useState(false);
  const [cutBusy, setCutBusy] = useState(false);
  const staffAlerts = useStaffAlerts();
  function load() {
    fetch("/api/dzib/accounts").then(async (r) => {
      if (!r.ok) { setErr("Sin acceso: entra primero con tu clave en /dzib/personal"); return; }
      setErr(""); setData(await r.json());
    }).catch(() => setErr("No se pudieron cargar las cuentas"));
  }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  async function post(action: string, body: any) {
    const res = await fetch("/api/dzib/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
    const d = await res.json().catch(() => null);
    setMsg(res.ok ? "Listo." : (d?.error ?? "No se pudo hacer"));
    load();
  }
  const accounts = data?.accounts ?? [];
  const summary = data?.summary;
  const cut = data?.cut;
  const isCaja = data?.role === "caja";
  async function hacerCorte() {
    if (!window.confirm("¿Seguro que quieres hacer el corte final del día?")) return;
    setCutBusy(true);
    const res = await fetch("/api/dzib/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "corte" }) });
    const d = await res.json().catch(() => null);
    setCutBusy(false);
    if (!res.ok) { setMsg(d?.error ?? "No se pudo hacer el corte"); return; }
    setMsg("Corte final del día guardado.");
    setShowCutReview(false);
    load();
  }
  // Alertas: vibración + bip + banner cuando una mesa pide la cuenta, o
  // cuando el mesero cierra una mesa (queda libre para nuevos comensales).
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
    <main className="wrap">
      <h2>Dzib — Caja</h2>
      <p className="muted">Todas las cuentas. Caja ve todo: cocina, meseros y cuentas. Se actualiza cada 5 segundos.</p>
      <StaffAlertUI alerts={staffAlerts} />
      <p><button onClick={load}>Actualizar</button> <a href="/dzib/cocina">Ver cocina</a> · <a href="/dzib/meseros">Ver meseros</a></p>
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
            {a.items?.map((i: any) => (
              <div key={i.id}>
                <div className="item"><span>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ""}{i.detail ? <span className="detail-line"> · {i.detail}</span> : ""}{i.tiempo ? ` · ${i.tiempo} (Comida ${i.corrida ?? 1})` : (i.kind === "agua" && i.corrida ? ` · Comida ${i.corrida}` : "")}</span><span>{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</span></div>
                {i.notes && <div className="notes-box">⚠ Indicaciones: {i.notes}</div>}
              </div>
            ))}
            <p>
              {a.status === "cuenta-pedida" && (
                <button type="button" className="staff-btn" onClick={() => post("confirm-pay", { accountId: a.id })}>Confirmar pago</button>
              )}
              {a.payment?.method === "efectivo" && a.status !== "cerrada" && (
                <button type="button" className="staff-btn" onClick={() => post("change-ready", { accountId: a.id, ready: !a.changeReady })}>{a.changeReady ? "Quitar cambio listo" : "Marcar cambio listo"}</button>
              )}
              {a.status !== "cerrada" && (
                <button type="button" className="staff-btn" onClick={() => post("close-caja", { accountId: a.id })}>Cerrar cuenta</button>
              )}
            </p>
          </div>
        );
      })}
      <p><a href="/dzib">Volver al menú</a> · <a href="/dzib/personal">Personal</a></p>

      {/* Resumen general del día: va hasta abajo, justo antes del corte
          final. Arriba quedan primero las cuentas abiertas y lo operativo. */}
      {isCaja && summary && (
        <div className="card" style={{ marginBottom: 12 }}>
          <b>Resumen del día — {summary.date}</b>
          {cut && <p className="muted">Corte hecho a las {mexicoTimeString(cut.closedAt)} (hora de México). El conteo empezó de nuevo en ceros; el detalle del corte está abajo.</p>}
          <div className="item"><span>Total de pedidos hoy</span><b>{summary.totalOrders}</b></div>
          <div className="item"><span>Total ganado hoy</span><b>{mxn(summary.totalCents)}</b></div>
          <div className="item"><span>Efectivo</span><span>{mxn(summary.cashCents)}</span></div>
          <div className="item"><span>Tarjeta (terminal)</span><span>{mxn(summary.cardCents)}</span></div>
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
                  <p><b>Revisa antes de confirmar:</b> {summary ? `${summary.totalOrders} pedidos · ${mxn(summary.totalCents)} ganados · Efectivo ${mxn(summary.cashCents)} · Tarjeta ${mxn(summary.cardCents)}` : "sin datos"}</p>
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
  );
}
