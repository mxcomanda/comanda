"use client";
import { useEffect, useState } from "react";

export default function Personal() {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [configured, setConfigured] = useState<{ caja: boolean; cocina: boolean; mesero: boolean } | null>(null);
  const [setup, setSetup] = useState({ caja: "", cocina: "", mesero: "" });

  useEffect(() => {
    fetch("/api/dzib/staff").then(async (r) => {
      const d = await r.json().catch(() => null);
      if (d?.configured) setConfigured(d.configured);
    }).catch(() => null);
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/dzib/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", pin }) });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error ?? "Clave incorrecta"); return; }
    setMsg(`Rol: ${data.role}`);
    const dest = data.role === "cocina" ? "/dzib/cocina" : data.role === "mesero" ? "/dzib/meseros" : "/dzib/caja";
    window.location.href = dest;
  }

  async function createPins(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/dzib/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setup", pins: setup }) });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error ?? "No se pudieron crear las claves"); return; }
    setConfigured({ caja: true, cocina: true, mesero: true });
    setMsg("Claves creadas. Ahora entra con tu clave de rol.");
  }

  const needsSetup = configured !== null && !configured.caja && !configured.cocina && !configured.mesero;

  return (
    <main className="wrap">
      <h2>Personal — Dzib</h2>
      {needsSetup ? (
        <>
          <p className="muted">Primera vez: crea las tres claves por rol. Cada una de 4 a 8 dígitos, las tres distintas. No hay clave por defecto y solo Caja las podrá cambiar después.</p>
          <form onSubmit={createPins}>
            <label>Clave de Caja<input inputMode="numeric" placeholder="4 a 8 dígitos" value={setup.caja} onChange={(e) => setSetup({ ...setup, caja: e.target.value })} /></label>
            <br /><br />
            <label>Clave de Cocina<input inputMode="numeric" placeholder="4 a 8 dígitos" value={setup.cocina} onChange={(e) => setSetup({ ...setup, cocina: e.target.value })} /></label>
            <br /><br />
            <label>Clave de Meseros<input inputMode="numeric" placeholder="4 a 8 dígitos" value={setup.mesero} onChange={(e) => setSetup({ ...setup, mesero: e.target.value })} /></label>
            <br /><br />
            <button className="btn btn-red" type="submit">Crear claves</button>
          </form>
        </>
      ) : (
        <>
          <p className="muted">Entra con tu clave por rol (4 a 8 dígitos). Cocina solo ve Cocina, Meseros solo Meseros, Caja ve todo. No hay clave por defecto.</p>
          <form onSubmit={login}>
            <input inputMode="numeric" placeholder="Clave" value={pin} onChange={(e) => setPin(e.target.value)} />
            <br /><br />
            <button className="btn btn-red" type="submit">Entrar</button>
          </form>
        </>
      )}
      {msg && <p>{msg}</p>}
    </main>
  );
}
