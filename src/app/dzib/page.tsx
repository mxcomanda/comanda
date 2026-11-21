// /dzib — vista del comensal. Acceso solo por QR de mesa (?mesa=N).
// Sin QR válido solo se ve el menú con el aviso de escanear.
// Componente de servidor: el menú se sirve ya renderizado (no solo en el cliente).
"use client";
import { useState } from "react";
import { DZIB_BREAKFAST, DZIB_DAILY_MENU_EXAMPLE, DZIB_SETTINGS, DZIB_TABLES } from "@/data/dzib";
import { mxn } from "@/lib/types";

export default function DzibPage({ searchParams }: { searchParams: { mesa?: string } }) {
  const mesa = Number(searchParams?.mesa);
  const table = DZIB_TABLES.find((t) => t.id === mesa);
  const [cart, setCart] = useState<{ name: string; priceCents: number; tiempo?: string }[]>([]);
  const [msg, setMsg] = useState("");
  const total = cart.reduce((s, i) => s + i.priceCents, 0);
  async function order() {
    if (!table) return;
    const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id, items: cart.map((c) => ({ name: c.name, priceCents: c.priceCents, tiempo: c.tiempo ?? null })) }) });
    const data = await res.json();
    setMsg(res.ok ? `Pedido enviado a cocina. Cuenta de ${table.label}: ${mxn(data.totalCents ?? total)}` : (data.error ?? "No se pudo enviar el pedido"));
    if (res.ok) setCart([]);
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
    <main className="wrap">
      <h2>Dzib — Regina 54, Centro Histórico</h2>
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
      <h2>Menú de comida</h2>
      <p className="danger">Menú de ejemplo (hoja del 1 de noviembre). Sencillo $45 y especial $67 sin confirmar. El restaurante publica el menú de hoy cada día en Admin.</p>
      {(["primero", "segundo", "tercero"] as const).map((t) => (
        <div key={t}><h3>{t === "primero" ? "1er tiempo" : t === "segundo" ? "2º tiempo" : "3er tiempo"}</h3>
          {DZIB_DAILY_MENU_EXAMPLE.items.filter((i) => i.tiempo === t).map((i) => (
            <div className="item" key={i.id}><div><b>{i.name}</b></div><span>{mxn(i.soloPriceCents)} {table && <button onClick={() => setCart([...cart, { name: i.name, priceCents: i.soloPriceCents, tiempo: t }])}>Pedir</button>}</span></div>
          ))}
        </div>
      ))}
      <p className="muted">Los tiempos del menú se piden uno por uno, en orden (1º, luego 2º, luego 3º). Cada tiempo avisa a cocina y al mesero. El cobro es al final del servicio: terminal o efectivo con cambio exacto.</p>
      <p className="muted">Agua del día: precio por confirmar (en la app de Muse: $15 vaso / $40 jarra 1 L / $80 jarra 2.5 L, valores iniciales sin confirmar).</p>
      {table && cart.length > 0 && (
        <div className="card"><b>Tu pedido — {table.label}</b>
          {cart.map((c, idx) => <div key={idx} className="item"><span>{c.name}{c.tiempo ? ` · ${c.tiempo}` : ""}</span><span>{mxn(c.priceCents)}</span></div>)}
          <p><b>Total: {mxn(total)}</b></p>
          <button className="btn btn-red" onClick={order}>Enviar pedido a cocina</button>
        </div>
      )}
      {msg && <p>{msg}</p>}
      <p><a href="/dzib/personal">Personal</a></p>
    </main>
  );
}
