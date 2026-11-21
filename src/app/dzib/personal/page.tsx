"use client";
import { useState } from "react";
export default function Personal() {
  const [pin, setPin] = useState("");
  const [msg, setMsg] = useState("");
  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/dzib/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", pin }) });
    const data = await res.json();
    if (!res.ok) { setMsg(data.error ?? "Clave incorrecta"); return; }
    setMsg(`Rol: ${data.role}`);
    const dest = data.role === "cocina" ? "/dzib/cocina" : data.role === "mesero" ? "/dzib/meseros" : "/dzib/caja";
    window.location.href = dest;
  }
  return (
    <main className="wrap">
      <h2>Personal — Dzib</h2>
      <p className="muted">Entra con tu clave por rol (4 a 8 dígitos). Cocina solo ve Cocina, Meseros solo Meseros, Caja ve todo. No hay clave por defecto: el encargado la crea la primera vez.</p>
      <form onSubmit={login}>
        <input inputMode="numeric" placeholder="Clave" value={pin} onChange={(e) => setPin(e.target.value)} />
        <br /><br />
        <button className="btn btn-red" type="submit">Entrar</button>
      </form>
      {msg && <p>{msg}</p>}
      <p className="muted">¿Primera vez? El encargado crea las claves en Admin → Ajustes → Claves por rol (solo Caja las crea o cambia después).</p>
    </main>
  );
}
