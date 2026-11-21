"use client";
import { useEffect, useState } from "react";
export default function CocinaView() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  function load() {
    fetch("/api/dzib/kitchen").then(async (r) => {
      if (!r.ok) { setErr("Sin acceso: entra primero con tu clave en /dzib/personal"); return; }
      setErr(""); setData(await r.json());
    }).catch(() => setErr("No se pudo cargar la cocina"));
  }
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  const items = data?.items ?? [];
  return (
    <main className="wrap">
      <h2>Dzib — Cocina</h2>
      <p className="muted">Solo platillos pedidos (los tiempos en espera no aparecen hasta que el comensal los pide). Se actualiza cada 10 segundos.</p>
      <p><button onClick={load}>Actualizar</button></p>
      {err ? <p className="danger">{err}</p> : items.length === 0 ? <p className="muted">No hay platillos pendientes.</p> : items.map((i: any) => (
        <div className="item" key={i.id}><div><b>{i.name}</b><div className="muted">{i.table}{i.tiempo ? ` · ${i.tiempo}` : ""}</div></div><span>{i.status}</span></div>
      ))}
      <p><a href="/dzib">Volver al menú</a></p>
    </main>
  );
}
