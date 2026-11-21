// /dzib — vista del comensal. Acceso solo por QR de mesa (?mesa=N).
// Sin QR válido solo se ve el menú con el aviso de escanear.
// Diseño Dzib: banda rótulo oscura, textura de piedra, paleta
// piedra / naranja quemado / dorado, como en la app original de Muse.
"use client";
import { useState } from "react";
import { DZIB_BREAKFAST, DZIB_DAILY_MENU_TODAY, DZIB_SETTINGS, DZIB_TABLES } from "@/data/dzib";
import { mxn } from "@/lib/types";

const MENU = DZIB_DAILY_MENU_TODAY;

export default function DzibPage({ searchParams }: { searchParams: { mesa?: string } }) {
  const mesa = Number(searchParams?.mesa);
  const table = DZIB_TABLES.find((t) => t.id === mesa);
  const [cart, setCart] = useState<{ name: string; priceCents: number; tiempo?: string }[]>([]);
  const [msg, setMsg] = useState("");
  const [accountId, setAccountId] = useState("");
  const total = cart.reduce((s, i) => s + i.priceCents, 0);
  async function order() {
    if (!table) return;
    const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id, items: cart.map((c) => ({ name: c.name, priceCents: c.priceCents, tiempo: c.tiempo ?? null })) }) });
    const data = await res.json();
    setMsg(res.ok ? `Pedido enviado a cocina. Cuenta de ${table.label}: ${mxn(data.totalCents ?? total)}` : (data.error ?? "No se pudo enviar el pedido"));
    if (res.ok) { setAccountId(data.accountId ?? ""); setCart([]); }
  }
  async function pedirTiempo(tiempo: "primero" | "segundo" | "tercero") {
    if (!accountId) { setMsg("Primero envía tu pedido con el botón de abajo, luego pide cada tiempo aquí."); return; }
    const res = await fetch("/api/dzib/course", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, tiempo }) });
    const data = await res.json();
    setMsg(res.ok ? (data.message ?? "Tiempo pedido.") : (data.error ?? "No se pudo pedir el tiempo"));
  }
  const sencillos = DZIB_BREAKFAST.filter((i) => i.category === "desayuno");
  const especiales = DZIB_BREAKFAST.filter((i) => i.category === "especial");
  const otras = DZIB_BREAKFAST.filter((i) => i.category === "otra");
  const extras = DZIB_BREAKFAST.filter((i) => i.category === "extra");
  const section = (title: string, items: typeof DZIB_BREAKFAST) => (
    <>
      <h2>{title}</h2>
      {items.map((i) => (
        <div className="item" key={i.id}><div><b>{i.name}</b>{i.description && <div className="muted">{i.description}</div>}</div><span>{mxn(i.priceCents)} {table && <button onClick={() => setCart([...cart, { name: i.name, priceCents: i.priceCents }])}>Agregar</button>}</span></div>
      ))}
    </>
  );
  return (
    <div className="dzib">
      <header className="dzib-header">
        <div className="dzib-header-inner">
          <div className="dzib-brand">DZIB</div>
          <div className="dzib-sub">Regina 54 · Centro Histórico · Cocina casera mexicana</div>
        </div>
      </header>
      <main className="wrap">
        {!table ? (
          <p className="danger">Escanea el código QR de tu mesa para pedir. Sin QR solo puedes ver el menú.</p>
        ) : (
          <p><span className="badge">{table.label}</span> Estás pidiendo para {table.label}.</p>
        )}
        <h2>Guisado de hoy — {mxn(DZIB_SETTINGS.guisadoPriceCents)}</h2>
        <div className="item"><div><b>{DZIB_SETTINGS.guisadoDelDia}</b><div className="muted">Guisado del día</div></div><span className="price">{mxn(DZIB_SETTINGS.guisadoPriceCents)}</span></div>
        <p className="muted">Desayunos sencillos incluyen café de olla o té, y jugo de naranja o fruta (papaya con plátano).</p>
        {section("Desayunos sencillos — $82", sencillos)}
        {section("Desayunos especiales — $92", especiales)}
        {section("Otras opciones", otras)}
        {section("Extras", extras)}
        <h2>Menú de comida — hoy, sábado 21 de noviembre de 2026</h2>
        <p className="dzib-today"><b>Menú sencillo de 3 tiempos — $91.00</b> (no incluye agua ni postre). 2º tiempo solo $26, guisado solo $79, menú de $78. Servicio de 1:30 pm a 7:00 pm. Todos nuestros precios incluyen IVA.</p>
        {(["primero", "segundo", "tercero"] as const).map((t) => (
          <div key={t}>
            <h3>{t === "primero" ? "1er tiempo" : t === "segundo" ? "2º tiempo" : "3er tiempo"}</h3>
            {t === "primero" && <p className="muted">El 1er tiempo es parte del menú sencillo de $91; se liquida en caja.</p>}
            {MENU.items.filter((i) => i.tiempo === t).map((i) => (
              <div className="item" key={i.id}><div><b>{i.name}</b></div><span>{i.soloPriceCents === 0 ? "En menú sencillo" : mxn(i.soloPriceCents)} {table && <button onClick={() => setCart([...cart, { name: i.name, priceCents: i.soloPriceCents, tiempo: t }])}>Pedir</button>}</span></div>
            ))}
            {table && accountId && (
              <p><button onClick={() => pedirTiempo(t)}>Pedir el {t === "primero" ? "1er" : t === "segundo" ? "2º" : "3er"} tiempo ahora</button></p>
            )}
          </div>
        ))}
        <p className="muted">Los tiempos del menú se piden uno por uno, en orden (1º, luego 2º, luego 3º). Cada tiempo avisa a cocina y al mesero. El cobro es al final del servicio: terminal o efectivo con cambio exacto.</p>
        <p className="muted">Agua del día: precio por confirmar (en la app de Muse: $15 vaso / $40 jarra 1 L / $80 jarra 2.5 L, valores iniciales sin confirmar).</p>
        {table && cart.length > 0 && (
          <div className="card"><b>Tu pedido — {table.label}</b>
            {cart.map((c, idx) => <div key={idx} className="item"><span>{c.name}{c.tiempo ? ` · ${c.tiempo}` : ""}</span><span>{c.priceCents === 0 ? "En menú sencillo" : mxn(c.priceCents)}</span></div>)}
            <p><b>Total: {mxn(total)}</b></p>
            <button className="btn btn-red" onClick={order}>Enviar pedido a cocina</button>
          </div>
        )}
        {msg && <p>{msg}</p>}
        <p><a href="/dzib/personal">Personal</a></p>
      </main>
    </div>
  );
}
