// Cocina y barra de Los Cocuyos: solo lo que el comensal ya pidió
// (todo va directo con estado "pendiente"). Cada ítem avanza: Recibido
// → En preparación → Listo para recoger (avisa al mesero). Cuando un
// ítem queda listo, su botón cambia a VERDE y dice "En espera del
// mesero": cocina ya no hace nada más con él; se queda visible hasta
// que el MESERO lo marca entregado desde su vista, y en ese momento
// desaparece de aquí. Los ítems se agrupan por estación (Cocina y
// Barra), cada uno con su etiqueta. Se actualiza cada 5 s.
// Tipografía 20% más grande que el resto de la app (clase "cocina"
// en el main, reglas en globals.css), igual que en Dzib.
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { STATUS_LABEL } from "@/lib/types";
import { useStaffAlerts, StaffAlertUI, type StaffEvent } from "@/app/dzib/StaffAlerts";

const NEXT_LABEL: Record<string, string> = {
  pendiente: "Empezar a preparar",
  preparando: "Marcar listo para recoger",
};

export default function CocinaView() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const staffAlerts = useStaffAlerts();
  function load() {
    fetch("/api/cocuyos/kitchen").then(async (r) => {
      if (!r.ok) { setErr("Sin acceso: entra primero con tu clave en /cocuyos/personal"); return; }
      setErr(""); setData(await r.json());
    }).catch(() => setErr("No se pudo cargar la cocina"));
  }
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);
  async function advance(itemId: string) {
    const res = await fetch("/api/cocuyos/kitchen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId }) });
    const d = await res.json().catch(() => null);
    if (!res.ok) { setMsg(d?.error ?? "No se pudo avanzar el platillo"); return; }
    setMsg(`Actualizado: ${STATUS_LABEL[d.status as keyof typeof STATUS_LABEL] ?? d.status}`);
    if (d.status === "preparando") staffAlerts.retract([`nuevo:${itemId}`]);
    load();
  }
  async function clearAlert(accountId: string) {
    await fetch("/api/cocuyos/kitchen", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clear-alert", accountId }) });
    load();
  }
  const items = (data?.items ?? []).filter((i: any) => i.status !== "entregado");
  const alerts = data?.alerts ?? [];
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
  const byStation: Record<string, any[]> = { cocina: [], barra: [] };
  for (const i of items) {
    const key = i.station === "barra" ? "barra" : "cocina";
    (byStation[key] ??= []).push(i);
  }
  const byTable = (list: any[]) => {
    const m: Record<string, any[]> = {};
    for (const i of list) (m[i.table] ??= []).push(i);
    return m;
  };
  const renderSection = (stationKey: "cocina" | "barra", title: string) => {
    const list = byStation[stationKey] ?? [];
    if (list.length === 0) return null;
    return (
      <div key={stationKey} style={{ marginBottom: 16 }}>
        <h3>{title} ({list.length})</h3>
        {Object.entries(byTable(list)).map(([table, itemsInTable]) => (
          <div className="card" key={table} style={{ marginBottom: 12 }}>
            <b>{table}</b>
            {itemsInTable.map((i: any) => (
              <div className="item" key={i.id}>
                <div><b>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ""}</b><div className="muted">{stationKey === "barra" ? "Barra" : "Cocina"} · {STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</div>{i.notes && <div className="notes-box">⚠ Indicaciones: {i.notes}</div>}</div>
                <span>
                  {NEXT_LABEL[i.status] ? (
                    <button type="button" className="staff-btn" onClick={() => advance(i.id)}>{NEXT_LABEL[i.status]}</button>
                  ) : i.status === "listo" ? (
                    <button type="button" className="staff-btn" disabled style={{ background: "#16a34a", color: "#fff", borderColor: "#16a34a", cursor: "default", opacity: 1 }}>En espera del mesero</button>
                  ) : <span className="status-pill entregado">Entregado ✓</span>}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };
  return (
    <div className="dzib cocuyos">
    <main className="wrap cocina">
      <p style={{ margin: "0 0 4px" }}><Image src="/los-cocuyos-logo.svg" alt="Taquería Los Cocuyos" width={64} height={64} /></p>
      <h2>Los Cocuyos — Cocina y Barra</h2>
      <p className="muted">Solo platillos pedidos, agrupados por estación (Cocina y Barra). Se actualiza cada 5 segundos.</p>
      <StaffAlertUI alerts={staffAlerts} />
      {alerts.map((a: any) => (
        <div className="alert red" key={a.accountId}>⚠ ¡{a.tableLabel} llamó a cocina! <button type="button" onClick={() => clearAlert(a.accountId)}>Visto</button></div>
      ))}
      <p><button onClick={load}>Actualizar</button></p>
      {msg && <p>{msg}</p>}
      {err ? <p className="danger">{err}</p> : items.length === 0 ? <p className="muted">No hay platillos pendientes.</p> : (
        <>
          {renderSection("cocina", "🍳 Cocina")}
          {renderSection("barra", "🍹 Barra")}
        </>
      )}
      <p><a href="/cocuyos">Volver al menú</a> · <a href="/cocuyos/personal">Personal</a></p>
    </main>
    </div>
  );
}
