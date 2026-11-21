"use client";
import { useEffect, useState } from "react";
import { DZIB_TABLES } from "@/data/dzib";
import { STATUS_LABEL } from "@/lib/types";
import { useStaffAlerts, StaffAlertUI, type StaffEvent } from "../StaffAlerts";

// Meseros: mapa de las 12 mesas, cuentas abiertas con sus platillos y su
// estado, avisos de "listo para recoger" y de "cambio listo", y botones
// para marcar entregado y avisar a cocina. Se actualiza cada 5 s.
export default function MeserosView() {
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
    setMsg(res.ok ? (d?.message ?? "Listo.") : (d?.error ?? "No se pudo hacer"));
    load();
  }
  const accounts = (data?.accounts ?? []).filter((a: any) => a.status !== "cerrada");
  const ready = accounts.flatMap((a: any) => a.items.filter((i: any) => i.status === "listo").map((i: any) => ({ ...i, tableLabel: a.tableLabel })));
  const changeReady = accounts.filter((a: any) => a.changeReady && a.payment?.method === "efectivo" && a.status !== "cerrada");
  // Alertas: vibración + bip + banner cuando un platillo queda listo
  // para recoger o caja marca el cambio listo.
  useEffect(() => {
    if (!data) return;
    const events: StaffEvent[] = [
      ...ready.map((i: any) => ({ key: `listo:${i.id}`, text: `¡Pedido listo para recoger! ${i.name} (${i.tableLabel})` })),
      ...changeReady.map((a: any) => ({ key: `cambio:${a.id}`, text: `¡Cambio listo en caja para ${a.tableLabel}! Lleva $${(((a.payment.cashCents ?? 0) - a.totalCents) / 100).toFixed(0)} de cambio.` })),
    ];
    staffAlerts.notify(events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const byTable = new Map<number, any>();
  for (const a of accounts) byTable.set(a.tableId, a);
  return (
    <main className="wrap">
      <h2>Dzib — Meseros</h2>
      <p className="muted">Cuentas abiertas por mesa. Se actualiza cada 5 segundos.</p>
      <StaffAlertUI alerts={staffAlerts} />
      {ready.length > 0 && (
        <div className="alert gold">🔔 ¡Pedido listo para recoger! {ready.map((i: any) => `${i.name} (${i.tableLabel})`).join(" · ")}</div>
      )}
      {changeReady.map((a: any) => (
        <div className="alert green" key={a.id}>💵 ¡Cambio listo en caja para {a.tableLabel}! Lleva ${((a.payment.cashCents ?? 0) - a.totalCents) / 100} de cambio.</div>
      ))}
      <p><button onClick={load}>Actualizar</button></p>
      {msg && <p>{msg}</p>}
      <h3>Mapa de mesas</h3>
      <div className="staff-grid">
        {DZIB_TABLES.map((t) => {
          const acc = byTable.get(t.id);
          return (
            <div className={`table-cell${acc ? " busy" : ""}`} key={t.id}>
              {t.label}<div className="sub">{acc ? `${acc.status} · $${(acc.totalCents / 100).toFixed(0)}` : "Libre"}</div>
            </div>
          );
        })}
      </div>
      {err ? <p className="danger">{err}</p> : accounts.length === 0 ? <p className="muted">No hay cuentas abiertas.</p> : accounts.map((a: any) => (
        <div className="card" key={a.id} style={{ marginBottom: 12 }}>
          <b>{a.tableLabel}</b> — {a.status} — Total: ${(a.totalCents / 100).toFixed(0)}
          {a.payment && <div className="muted">Pago: {a.payment.method === "efectivo" ? `Efectivo con $${(a.payment.cashCents ?? 0) / 100} · Cambio: $${(((a.payment.cashCents ?? 0) - a.totalCents) / 100).toFixed(0)}` : "Tarjeta (terminal)"}{a.changeReady ? " · Cambio listo ✓" : ""}</div>}
          {a.items?.map((i: any) => (
            <div className="item" key={i.id}>
              <span>{i.name}{i.tiempo ? ` · ${i.tiempo}` : ""}<div className="muted">{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</div></span>
              <span>
                {i.status !== "espera" && i.status !== "entregado" && i.status !== "cancelado" && (
                  <button type="button" className="staff-btn" onClick={() => post("deliver", { accountId: a.id, itemId: i.id })}>Marcar entregado</button>
                )}
                {i.status === "entregado" && <span className="status-pill entregado">Entregado ✓</span>}
              </span>
            </div>
          ))}
          <p><button type="button" onClick={() => post("call-kitchen", { accountId: a.id })}>Avisar a cocina</button></p>
        </div>
      ))}
      <p><a href="/dzib">Volver al menú</a> · <a href="/dzib/personal">Personal</a></p>
    </main>
  );
}
