"use client";
import { useEffect, useState } from "react";
export default function StaffView() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    fetch("/api/dzib/accounts").then(async (r) => {
      if (!r.ok) { setErr("Sin acceso: entra primero con tu clave en /dzib/personal"); return; }
      setData(await r.json());
    });
  }, []);
  return (
    <main className="wrap">
      <h2>Dzib — vista de personal</h2>
      <p className="muted">Esta vista está protegida por rol en el servidor. Cocina solo ve sus platillos, Meseros solo sus mesas, Caja ve todo (incluye Admin).</p>
      {err ? <p className="danger">{err}</p> : <pre>{JSON.stringify(data, null, 2)}</pre>}
      <p><a href="/dzib">Volver al menú</a></p>
    </main>
  );
}
