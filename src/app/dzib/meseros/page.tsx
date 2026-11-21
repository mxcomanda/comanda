"use client";
import { useEffect, useState } from "react";
import { DZIB_TABLES } from "@/data/dzib";
import { STATUS_LABEL } from "@/lib/types";
import { useStaffAlerts, StaffAlertUI, type StaffEvent } from "../StaffAlerts";

// Meseros: mapa de las 12 mesas, cuentas abiertas con sus platillos y su
// estado, avisos de "listo para recoger" y de "cambio listo", y botones
// para marcar entregado, avisar a cocina y cerrar la cuenta (liberar la
// mesa para nuevos comensales; caja recibe el aviso). Las alertas se
// retiran solas cuando el mesero entrega el platillo o se atiende la
// cuenta. Se actualiza cada 5 s.
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
  async function post(action: string, body: any, okMsg?: string) {
    const res = await fetch("/api/dzib/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...body }) });
    const d = await res.json().catch(() => null);
    setMsg(res.ok ? (okMsg ?? d?.message ?? "Listo.") : (d?.error ?? "No se pudo hacer"));
    load();
  }
  // Cerrar la cuenta y liberar la mesa para nuevos comensales. Si hay
  // platillos sin entregar o la cuenta no está pagada, pide confirmación
  // y deja claro qué queda pendiente (la cuenta queda registrada como
  // cerrada sin cobrar y no entra en el total ganado del día).
  function cerrarMesa(a: any) {
    const pending = (a.items ?? []).filter((i: any) => ["pendiente", "preparando", "listo"].includes(i.status));
    const unpaid = a.status !== "pagada";
    if (pending.length > 0 || unpaid) {
      const lines = [
        `¿Seguro que quieres cerrar ${a.tableLabel} y liberar la mesa?`,
        pending.length > 0 ? `Platillos sin entregar: ${pending.map((i: any) => i.name).join(", ")}.` : "",
        unpaid ? `La cuenta NO está pagada (total $${(a.totalCents / 100).toFixed(0)}, estado: ${a.status}). Quedará registrada como cerrada sin cobrar.` : "",
      ].filter(Boolean).join("\n");
      if (!window.confirm(lines)) return;
    }
    void post("close", { accountId: a.id }, "Mesa liberada. Caja fue avisada.");
  }
  const accounts = (data?.accounts ?? []).filter((a: any) => a.status !== "cerrada");
  const ready = accounts.flatMap((a: any) => a.items.filter((i: any) => i.status === "listo").map((i: any) => ({ ...i, tableLabel: a.tableLabel })));
  const changeReady = accounts.filter((a: any) => a.changeReady && a.payment?.method === "efectivo" && a.status !== "cerrada");
  // Mesas que pidieron la cuenta con tarjeta (terminal): el mesero debe
  // llevar la terminal a la mesa de inmediato.
  const terminal = accounts.filter((a: any) => a.status === "cuenta-pedida" && a.payment?.method === "terminal");
  // Alertas: vibración + bip + banner cuando un platillo queda listo
  // para recoger, caja marca el cambio listo, o una mesa pide la cuenta
  // con terminal (con el monto a cobrar, grande y claro). Las alertas se
  // retiran solas cuando se atienden: al entregar el platillo, al
  // cerrarse o pagarse la cuenta, o al quitarse el cambio listo.
  useEffect(() => {
    if (!data) return;
    const all = (data.accounts ?? []) as any[];
    const delivered = all.flatMap((a: any) => (a.items ?? []).filter((i: any) => i.status === "entregado").map((i: any) => `listo:${i.id}`));
    const resolved = all.flatMap((a: any) => {
      const out: string[] = [];
      if (a.status !== "cuenta-pedida") out.push(`terminal:${a.id}`);
      if (!a.changeReady || a.status === "cerrada" || a.status === "pagada") out.push(`cambio:${a.id}`);
      return out;
    });
    staffAlerts.retract([...delivered, ...resolved]);
    const events: StaffEvent[] = [
      ...ready.map((i: any) => ({ key: `listo:${i.id}`, text: `¡Pedido listo para recoger! ${i.name} (${i.tableLabel})` })),
      ...changeReady.map((a: any) => ({ key: `cambio:${a.id}`, text: `¡Cambio listo en caja para ${a.tableLabel}! Lleva $${(((a.payment.cashCents ?? 0) - a.totalCents) / 100).toFixed(0)} de cambio.` })),
      ...terminal.map((a: any) => ({ key: `terminal:${a.id}`, text: `${a.tableLabel} pidió la cuenta con terminal — lleva la terminal · Cobra $${(a.totalCents / 100).toFixed(0)}` })),
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
      {terminal.map((a: any) => (
        <div className="alert gold" key={a.id}>💳 {a.tableLabel} pidió la cuenta con terminal — lleva la terminal. <b style={{ fontSize: 22 }}>Cobra: ${(a.totalCents / 100).toFixed(0)}</b></div>
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
      {err ? <p className="danger">{err}</p> : accounts.length === 0 ? <p className="muted">No hay cuentas abiertas.</p> : accounts.map((a: any) => {
        const pendingItems = (a.items ?? []).filter((i: any) => ["pendiente", "preparando", "listo"].includes(i.status));
        return (
        <div className="card" key={a.id} style={{ marginBottom: 12 }}>
          <b>{a.tableLabel}</b> — {a.status} — Total: ${(a.totalCents / 100).toFixed(0)}
          {a.payment && <div className="muted">Pago: {a.payment.method === "efectivo" ? `Efectivo con $${(a.payment.cashCents ?? 0) / 100} · Cambio: $${(((a.payment.cashCents ?? 0) - a.totalCents) / 100).toFixed(0)}` : "Tarjeta (terminal)"}{a.changeReady ? " · Cambio listo ✓" : ""}</div>}
          {a.items?.map((i: any) => (
            <div className="item" key={i.id}>
              <span>{i.name}{i.tiempo ? ` · ${i.tiempo} (Corrida ${i.corrida ?? 1})` : ""}<div className="muted">{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</div></span>
              <span>
                {i.status !== "espera" && i.status !== "entregado" && i.status !== "cancelado" && (
                  <button type="button" className="staff-btn" onClick={() => { staffAlerts.retract([`listo:${i.id}`]); void post("deliver", { accountId: a.id, itemId: i.id }); }}>Marcar entregado</button>
                )}
                {i.status === "entregado" && <span className="status-pill entregado">Entregado ✓</span>}
              </span>
            </div>
          ))}
          {pendingItems.length > 0 && <p className="muted">⚠ Sin entregar: {pendingItems.map((i: any) => i.name).join(", ")}</p>}
          {a.status === "abierta" && <p className="muted">Sin pagar todavía (total ${(a.totalCents / 100).toFixed(0)}).</p>}
          {a.status === "cuenta-pedida" && <p className="muted">Cuenta pedida — esperando a caja.</p>}
          <p>
            <button type="button" onClick={() => post("call-kitchen", { accountId: a.id })}>Avisar a cocina</button>{" "}
            <button type="button" className="staff-btn" onClick={() => cerrarMesa(a)}>Cerrar cuenta · Liberar mesa</button>
          </p>
        </div>
        );
      })}
      <p><a href="/dzib">Volver al menú</a> · <a href="/dzib/personal">Personal</a></p>
    </main>
  );
}
