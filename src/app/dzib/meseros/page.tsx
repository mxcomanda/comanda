"use client";
import { useEffect, useState } from "react";
export default function MeserosView() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  function load() {
    fetch("/api/dzib/accounts").then(async (r) => {
      if (!r.ok) { setErr("Sin acceso: entra primero con tu clave en /dzib/personal"); return; }
      setErr(""); setData(await r.json());
    }).catch(() => setErr("No se pudieron cargar las cuentas"));
  }
  useEffect(() => { load(); const t = setInterval(load, 10000); return () => clearInterval(t); }, []);
  const accounts = data?.accounts ?? [];
  return (
    <main className="wrap">
      <h2>Dzib — Meseros</h2>
      <p className="muted">Cuentas abiertas por mesa. Se actualiza cada 10 segundos.</p>
      <p><button onClick={load}>Actualizar</button></p>
      {err ? <p className="danger">{err}</p> : accounts.length === 0 ? <p className="muted">No hay cuentas abiertas.</p> : accounts.map((a: any) => (
        <div className="card" key={a.id} style={{ marginBottom: 12 }}>
          <b>{a.tableLabel}</b> — {a.status} — Total: ${(a.totalCents / 100).toFixed(0)}
          {a.items?.map((i: any) => (
            <div className="item" key={i.id}><span>{i.name}{i.tiempo ? ` · ${i.tiempo}` : ""}</span><span>{i.status}</span></div>
          ))}
        </div>
      ))}
      <p><a href="/dzib">Volver al menú</a></p>
    </main>
  );
}
