"use client";
import { useEffect, useRef, useState } from "react";
import { DZIB_TABLES } from "@/data/dzib";
import { STATUS_LABEL } from "@/lib/types";
import { useStaffAlerts, StaffAlertUI, type StaffEvent } from "../StaffAlerts";

// Meseros: MAPA GRÁFICO del salón, con el pedido completo arriba de
// cada mesa. La vista se actualiza cada 5 s.
// - Fila izquierda: mesas 1 al 5, numeradas de ABAJO hacia arriba
//   (la 1 abajo, la 5 arriba).
// - Fila derecha: mesas 6 al 10, numeradas de ARRIBA hacia abajo
//   (la 6 arriba, la 10 abajo).
// - Puerta de entrada ABAJO del mapa: se entra desde abajo hacia
//   arriba; dibujada con su hueco y el arco de apertura.
// - Mesa ACTIVA (cuenta/pedido abierto): ROSA las del lado izquierdo,
//   AZUL las del lado derecho. Sin actividad: piedra/blanca, solo
//   contorno.
// - Arriba de cada mesa va el recuadro con su pedido COMPLETO, con los
//   mismos datos y acciones que tenía la lista de cuentas: platillos
//   con estado, indicaciones, pago, Marcar entregado, Avisar a cocina,
//   alertas y Cerrar cuenta. Nada se pierde.
// - Mesas 11 y 12 (Mesa 5B y 6B, segundo local) NO se eliminan: van en
//   una franja compacta debajo del mapa ("Segundo local"), con su mismo
//   recuadro de pedido y su color de activa (azul, como el lado
//   derecho), para que ninguna mesa quede fuera de servicio.
// - El número grande de cada mesa es su POSICIÓN en el salón (1–10);
//   debajo va siempre su etiqueta real (Mesa 1B, Mesa 2B…), la de los
//   QR y las cuentas: las posiciones 7–10 son Mesa 1B–4B.
// Las alertas se retiran solas cuando el mesero entrega el platillo o
// atiende la cuenta o la asistencia.
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
  // Llamadas de asistencia del botón circular del comensal, pendientes.
  const assistance = (data?.assistance ?? []) as any[];
  // Claves de asistencia que ya no están pendientes (el mesero las
  // atendió): hay que retirar su banner, si era el que se veía.
  const prevAssistanceRef = useRef<Set<string>>(new Set());
  // Alertas: vibración + bip + banner cuando un platillo queda listo
  // para recoger, caja marca el cambio listo, una mesa pide la cuenta
  // con terminal (con el monto a cobrar, grande y claro) o una mesa pide
  // asistencia. Las alertas se retiran solas cuando se atienden: al
  // entregar el platillo, al cerrarse o pagarse la cuenta, al quitarse el
  // cambio listo, o al marcar atendida la asistencia.
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
    const currentAssistance = assistance.map((c: any) => `asistencia:${c.id}`);
    const goneAssistance = [...prevAssistanceRef.current].filter((k) => !currentAssistance.includes(k));
    prevAssistanceRef.current = new Set(currentAssistance);
    staffAlerts.retract([...delivered, ...resolved, ...goneAssistance]);
    const events: StaffEvent[] = [
      ...ready.map((i: any) => ({ key: `listo:${i.id}`, text: `¡Pedido listo para recoger! ${i.name} (${i.tableLabel})` })),
      ...changeReady.map((a: any) => ({ key: `cambio:${a.id}`, text: `¡Cambio listo en caja para ${a.tableLabel}! Lleva $${(((a.payment.cashCents ?? 0) - a.totalCents) / 100).toFixed(0)} de cambio.` })),
      ...terminal.map((a: any) => ({ key: `terminal:${a.id}`, text: `${a.tableLabel} pidió la cuenta con terminal — lleva la terminal · Cobra $${(a.totalCents / 100).toFixed(0)}` })),
      ...assistance.map((c: any) => ({ key: `asistencia:${c.id}`, text: `¡${c.tableLabel} necesita asistencia! Ve a la mesa.` })),
    ];
    staffAlerts.notify(events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const byTable = new Map<number, any>();
  for (const a of accounts) byTable.set(a.tableId, a);

  // Recuadro del pedido COMPLETO de una mesa: los mismos datos y
  // acciones que tenía la lista de cuentas (platillos con su estado,
  // indicaciones especiales, pago y cambio, Marcar entregado, Avisar a
  // cocina y Cerrar cuenta · Liberar mesa).
  function renderAccountCard(a: any) {
    const pendingItems = (a.items ?? []).filter((i: any) => ["pendiente", "preparando", "listo"].includes(i.status));
    return (
      <div className="card">
        <b>{a.tableLabel}</b> — {a.status} — Total: ${(a.totalCents / 100).toFixed(0)}
        {a.payment && <div className="muted">Pago: {a.payment.method === "efectivo" ? `Efectivo con $${(a.payment.cashCents ?? 0) / 100} · Cambio: $${(((a.payment.cashCents ?? 0) - a.totalCents) / 100).toFixed(0)}` : "Tarjeta (terminal)"}{a.changeReady ? " · Cambio listo ✓" : ""}</div>}
        {a.items?.map((i: any) => (
          <div key={i.id}>
            <div className="item">
              <span>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ""}{i.detail ? <span className="detail-line"> · {i.detail}</span> : ""}{i.tiempo ? ` · ${i.tiempo} (Comida ${i.corrida ?? 1})` : (i.kind === "agua" && i.corrida ? ` · Comida ${i.corrida}` : "")}<div className="muted">{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</div></span>
              <span>
                {i.status !== "espera" && i.status !== "entregado" && i.status !== "cancelado" && (
                  <button type="button" className="staff-btn" onClick={() => { staffAlerts.retract([`listo:${i.id}`]); void post("deliver", { accountId: a.id, itemId: i.id }); }}>Marcar entregado</button>
                )}
                {i.status === "entregado" && <span className="status-pill entregado">Entregado ✓</span>}
              </span>
            </div>
            {i.notes && <div className="notes-box">⚠ Indicaciones: {i.notes}</div>}
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
  }

  const tableById = new Map(DZIB_TABLES.map((t) => [t.id, t]));
  // Una celda del mapa: arriba el recuadro del pedido completo (o
  // "Libre" si la mesa no tiene cuenta) y abajo la mesa dibujada con su
  // número y sus sillas. Activa: rosa a la izquierda, azul a la derecha.
  // El número grande es la POSICIÓN en el salón (1–10), como pidió el
  // dueño; debajo va siempre la etiqueta real de la mesa (Mesa 1B, Mesa
  // 2B…), que es la que traen los QR y las cuentas: las posiciones 7–10
  // del mapa son Mesa 1B–4B, y la franja de abajo son Mesa 5B y 6B.
  function salonCell(id: number, side: "izq" | "der", num: string) {
    const t = tableById.get(id)!;
    const acc = byTable.get(id);
    return (
      <div className="salon-cell" key={id}>
        {acc ? (
          <div className="pedido-box">{renderAccountCard(acc)}</div>
        ) : (
          <div className="pedido-libre">Libre</div>
        )}
        <div className={`mesa-dibujo${acc ? (side === "izq" ? " activa-izq" : " activa-der") : ""}`}>
          <span className="silla s-n" aria-hidden="true" />
          <span className="silla s-s" aria-hidden="true" />
          <span className="silla s-e" aria-hidden="true" />
          <span className="silla s-o" aria-hidden="true" />
          <span className="mesa-redonda">
            <span className="mesa-numero">{num}</span>
            <span className="mesa-estado">{t.label} · {acc ? `${acc.status} · $${(acc.totalCents / 100).toFixed(0)}` : "Libre"}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="dzib">
    <main className="wrap">
      <h2>Dzib — Meseros</h2>
      <p className="muted">Mapa del salón con el pedido de cada mesa. Se actualiza cada 5 segundos.</p>
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
      {assistance.map((c: any) => (
        <div className="alert gold" key={c.id}>🔔 ¡{c.tableLabel} necesita asistencia! Ve a la mesa.{" "}
          <button type="button" className="staff-btn" onClick={() => { staffAlerts.retract([`asistencia:${c.id}`]); void post("attend-assistance", { callId: c.id }, "Asistencia atendida."); }}>Atendido ✓</button>
        </div>
      ))}
      <p><button onClick={load}>Actualizar</button></p>
      {msg && <p>{msg}</p>}
      {err && <p className="danger">{err}</p>}
      {!err && accounts.length === 0 && <p className="muted">No hay cuentas abiertas.</p>}
      <h3>Mapa del salón</h3>
      <p className="muted">Izquierda: mesas 1 a 5 (la 1 abajo). Derecha: mesas 6 a 10 (la 6 arriba). Mesa activa: <b style={{ color: "#be185d" }}>rosa</b> a la izquierda, <b style={{ color: "#1d4ed8" }}>azul</b> a la derecha. Se entra por la puerta de abajo.</p>
      <div className="salon">
        <div className="salon-grid">
          <div className="salon-col">
            {[5, 4, 3, 2, 1].map((id) => salonCell(id, "izq", String(id)))}
          </div>
          <div className="salon-aisle" aria-hidden="true"><span>↑</span></div>
          <div className="salon-col">
            {[6, 7, 8, 9, 10].map((id) => salonCell(id, "der", String(id)))}
          </div>
        </div>
        <div className="salon-puerta">
          <svg viewBox="0 0 120 74" width="120" height="74" aria-hidden="true">
            <path d="M 12 12 A 58 58 0 0 1 70 70" fill="none" stroke="#c9a227" strokeWidth="2" strokeDasharray="5 4" />
            <line x1="12" y1="70" x2="12" y2="12" stroke="#241a12" strokeWidth="4" strokeLinecap="round" />
            <circle cx="12" cy="70" r="4" fill="#241a12" />
          </svg>
          <div className="salon-puerta-label">↑ ENTRADA</div>
        </div>
      </div>
      <h3>Segundo local — Restaurante 2</h3>
      <p className="muted">Mesas 5B y 6B, con su pedido completo y su color de activa (azul, como el lado derecho).</p>
      <div className="salon-strip">
        {[11, 12].map((id) => salonCell(id, "der", tableById.get(id)!.label.replace("Mesa ", "")))}
      </div>
      <p><a href="/dzib">Volver al menú</a> · <a href="/dzib/personal">Personal</a></p>
    </main>
    </div>
  );
}
