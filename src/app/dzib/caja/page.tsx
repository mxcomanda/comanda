"use client";
import { useEffect, useState } from "react";
import { STATUS_LABEL } from "@/lib/types";
import { useStaffAlerts, StaffAlertUI, type StaffEvent } from "../StaffAlerts";

// Caja: todas las cuentas con su total, método de pago, efectivo y cambio,
// y botones para confirmar el pago, marcar el cambio listo (avisa al
// mesero) y cerrar la cuenta. Se actualiza cada 5 s.
export default function CajaView() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
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
  // Alertas: vibración + bip + banner cuando una mesa pide la cuenta.
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
    staffAlerts.notify(events);
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
            {a.items?.map((i: any) => (
              <div className="item" key={i.id}><span>{i.name}{i.tiempo ? ` · ${i.tiempo}` : ""}</span><span>{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</span></div>
            ))}
            <p>
              {a.status === "cuenta-pedida" && (
                <button type="button" className="staff-btn" onClick={() => post("confirm-pay", { accountId: a.id })}>Confirmar pago</button>
              )}
              {a.payment?.method === "efectivo" && a.status !== "cerrada" && (
                <button type="button" className="staff-btn" onClick={() => post("change-ready", { accountId: a.id, ready: !a.changeReady })}>{a.changeReady ? "Quitar cambio listo" : "Marcar cambio listo"}</button>
              )}
              {a.status !== "cerrada" && (
                <button type="button" className="staff-btn" onClick={() => post("close", { accountId: a.id })}>Cerrar cuenta</button>
              )}
            </p>
          </div>
        );
      })}
      <p><a href="/dzib">Volver al menú</a> · <a href="/dzib/personal">Personal</a></p>
    </main>
  );
}
