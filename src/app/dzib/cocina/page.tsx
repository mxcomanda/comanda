"use client";
import { useEffect, useState } from "react";
import { STATUS_LABEL } from "@/lib/types";

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
  const byTable: Record<string, any[]> = {};
  for (const i of items) { (byTable[i.table] ??= []).push(i); }
  return (
    <main className="wrap">
      <h2>Dzib — Cocina</h2>
      <p className="muted">Solo platillos pedidos (los tiempos en espera no aparecen hasta que el comensal los pide). Se actualiza cada 5 segundos.</p>
      {alerts.map((a: any) => (
        <div className="alert red" key={a.accountId}>⚠ ¡{a.tableLabel} llamó a cocina! <button type="button" onClick={() => clearAlert(a.accountId)}>Visto</button></div>
      ))}
      <p><button onClick={load}>Actualizar</button></p>
      {msg && <p>{msg}</p>}
      {err ? <p className="danger">{err}</p> : items.length === 0 ? <p className="muted">No hay platillos pendientes.</p> : Object.entries(byTable).map(([table, list]) => (
        <div className="card" key={table} style={{ marginBottom: 12 }}>
          <b>{table}</b>
          {list.map((i: any) => (
            <div className="item" key={i.id}>
              <div><b>{i.name}</b><div className="muted">{i.tiempo ? `Tiempo: ${i.tiempo}` : "Por separado"} · {STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</div></div>
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
