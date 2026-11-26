// Personal — Los Cocuyos. Primera vez: el encargado crea las tres
// claves por rol (4 a 8 dígitos, las tres distintas, sin clave por
// defecto). Después, solo Caja las puede cambiar. El login agrega el
// rol a la sesión multi-rol (cookie comanda_staff, 1 año).
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Personal() {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  const [configured, setConfigured] = useState<{ caja: boolean; cocina: boolean; mesero: boolean } | null>(null);
  const [setup, setSetup] = useState({ caja: "", cocina: "", mesero: "" });

  useEffect(() => {
    fetch("/api/cocuyos/staff").then(async (r) => {
      const d = await r.json().catch(() => null);
      if (d?.configured) setConfigured(d.configured);
    }).catch(() => null);
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/cocuyos/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", pin }) });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error ?? "Clave incorrecta"); return; }
    setMsg(`Rol: ${data.role}`);
    const dest = data.role === "cocina" ? "/cocuyos/cocina" : data.role === "mesero" ? "/cocuyos/meseros" : "/cocuyos/caja";
    window.location.href = dest;
  }

  async function createPins(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/cocuyos/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "setup", pins: setup }) });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error ?? "No se pudieron crear las claves"); return; }
    setConfigured({ caja: true, cocina: true, mesero: true });
    setMsg("Claves creadas. Ahora entra con tu clave de rol.");
  }

  const needsSetup = configured !== null && !configured.caja && !configured.cocina && !configured.mesero;

  return (
    <div className="dzib cocuyos">
    <main className="wrap">
      <p style={{ margin: "0 0 4px" }}><Image src="/los-cocuyos-logo.svg" alt="Taquería Los Cocuyos" width={72} height={72} /></p>
      <h2>Personal — Los Cocuyos</h2>
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
      <p><a href="/cocuyos">Volver al menú</a></p>
    </main>
    </div>
  );
}
