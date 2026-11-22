"use client";
import { useEffect, useState } from "react";
import { STATUS_LABEL } from "@/lib/types";
import { useStaffAlerts, StaffAlertUI, type StaffEvent } from "../StaffAlerts";

// Cocina: solo los platillos que el comensal ya pidió (los tiempos en
// espera NO aparecen). Cada platillo avanza: Recibido → En preparación →
// Listo para recoger (avisa al mesero) → Entregado. Se actualiza cada 5 s.
const NEXT_LABEL: Record<string, string> = {
  pendiente: "Empezar a preparar",
  preparando: "Marcar listo para recoger",
  listo: "Marcar entregado",
};

export default function CocinaView() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const staffAlerts = useStaffAlerts();
  function load() {
    fetch("/api/dzib/kitchen").then(async (r) => {
      if (!r.ok) { setErr("Sin acceso: entra primero con tu clave en /dzib/personal"); return; }
      setErr(""); setData(await r.json());
    }).catch(() => setErr("No se pudo cargar la cocina"));
  }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  async function advance(itemId: string) {
    const res = await fetch("/api/dzib/kitchen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId }) });
    const d = await res.json().catch(() => null);
    if (!res.ok) { setMsg(d?.error ?? "No se pudo avanzar el platillo"); return; }
    setMsg(`Platillo actualizado: ${STATUS_LABEL[d.status as keyof typeof STATUS_LABEL] ?? d.status}`);
    // Al empezar a preparar, la notificación de "nueva orden" de ese
    // platillo se quita sola: ya la atendieron.
    if (d.status === "preparando") staffAlerts.retract([`nuevo:${itemId}`]);
    load();
  }
  async function clearAlert(accountId: string) {
    await fetch("/api/dzib/kitchen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear-alert", accountId }) });
    load();
  }
  // Solo platillos pendientes de preparar/entregar; los ya entregados no
  // estorban la lista (el mesero y caja ya los ven como entregados).
  const items = (data?.items ?? []).filter((i: any) => i.status !== "entregado");
  const alerts = data?.alerts ?? [];
  // Indicaciones anticipadas: tiempos que el comensal ya escribió con
  // indicación especial pero que todavía no pidió (siguen en espera).
  // Se ven aquí desde que se escriben — antes solo el mesero las veía y
  // parecía que a cocina "no le llegaban". NO se cocinan todavía: son
  // solo para que cocina sepa de antemano qué quitarle al platillo.
  const waitingNotes = data?.waitingNotes ?? [];
  // Alertas: vibración + bip + banner cuando llega una orden nueva o un
  // mesero llama a cocina. Solo los platillos que todavía no se empezaron
  // a preparar ("pendiente") son órdenes nuevas: en cuanto cocina marca
  // "Empezar a preparar", el aviso se retira solo.
  useEffect(() => {
    if (!data) return;
    const started = items.filter((i: any) => i.status !== "pendiente").map((i: any) => `nuevo:${i.id}`);
    staffAlerts.retract(started);
    const events: StaffEvent[] = [
      ...items.filter((i: any) => i.status === "pendiente").map((i: any) => ({ key: `nuevo:${i.id}`, text: `¡Nueva orden! ${i.name} (${i.table})` })),
      ...alerts.map((a: any) => ({ key: `llamada:${a.accountId}`, text: `¡${a.tableLabel} llamó a cocina!` })),
    ];
    staffAlerts.notify(events);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);
  const byTable: Record<string, any[]> = {};
  for (const i of items) {
    // Cada comida se ve por separado: "Mesa 3 · Comida 1", "Mesa 3 ·
    // Comida 2". Los desayunos van aparte ("Desayunos") y lo por
    // separado, aparte.
    const key = i.tiempo ? `${i.table} · Comida ${i.corrida ?? 1}` : `${i.table} · ${i.group === "desayuno" ? "Desayunos" : "Por separado"}`;
    (byTable[key] ??= []).push(i);
  }
  return (
    <main className="wrap">
      <h2>Dzib — Cocina</h2>
      <p className="muted">Solo platillos pedidos (los tiempos en espera no aparecen hasta que el comensal los pide). Las indicaciones que el comensal ya escribió para los próximos tiempos se ven abajo en “Próximos tiempos”. Se actualiza cada 5 segundos.</p>
      <StaffAlertUI alerts={staffAlerts} />
      {alerts.map((a: any) => (
        <div className="alert red" key={a.accountId}>⚠ ¡{a.tableLabel} llamó a cocina! <button type="button" onClick={() => clearAlert(a.accountId)}>Visto</button></div>
      ))}
      <p><button onClick={load}>Actualizar</button></p>
      {msg && <p>{msg}</p>}
      {waitingNotes.length > 0 && (
        <div className="card" style={{ marginBottom: 12, borderColor: "#c9a227" }}>
          <b>⏳ Próximos tiempos — indicaciones anticipadas</b>
          <p className="muted" style={{ margin: "6px 0" }}>Estos tiempos todavía NO se pidieron: no los cocines aún. El comensal ya escribió su indicación, y se muestra aquí desde ahora para que sepas de antemano qué quitarle al platillo. Cuando los pida, aparecerán arriba con su indicación.</p>
          {waitingNotes.map((i: any) => (
            <div className="item" key={i.id}>
              <div><b>{i.name}</b><div className="muted">{i.table}{i.tiempo ? ` · Tiempo: ${i.tiempo} · Comida ${i.corrida ?? 1}` : ""} · Todavía no pedido</div>{i.notes && <div className="notes-box">⚠ Indicaciones: {i.notes}</div>}</div>
            </div>
          ))}
        </div>
      )}
      {err ? <p className="danger">{err}</p> : items.length === 0 ? <p className="muted">No hay platillos pendientes.</p> : Object.entries(byTable).map(([table, list]) => (
        <div className="card" key={table} style={{ marginBottom: 12 }}>
          <b>{table}</b>
          {list.map((i: any) => (
            <div className="item" key={i.id}>
              <div><b>{i.name}</b>{i.detail && <div className="detail-line">{i.detail}</div>}<div className="muted">{i.tiempo ? `Tiempo: ${i.tiempo} · Comida ${i.corrida ?? 1}` : (i.group === "desayuno" ? "Desayunos" : "Por separado")} · {STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</div>{i.notes && <div className="notes-box">⚠ Indicaciones: {i.notes}</div>}</div>
              <span>
                {NEXT_LABEL[i.status] ? (
                  <button type="button" className="staff-btn" onClick={() => advance(i.id)}>{NEXT_LABEL[i.status]}</button>
                ) : <span className="status-pill entregado">Entregado ✓</span>}
              </span>
            </div>
          ))}
        </div>
      ))}
      <p><a href="/dzib">Volver al menú</a> · <a href="/dzib/personal">Personal</a></p>
    </main>
  );
}
