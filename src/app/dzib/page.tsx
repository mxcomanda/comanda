// /dzib — vista del comensal. Acceso solo por QR de mesa (?mesa=N).
// Submenús desplegables: Desayunos (hasta 12:30 pm), Menú de comida del
// día (por tiempos) y Pedir por separado. Flujo de pedido: se elige un
// platillo por tiempo y se pide con un botón grande por tiempo, en orden
// 1º → 2º → 3º; solo después del 3er tiempo aparece Pagar (tarjeta o
// efectivo con cambio). Diseño Dzib: banda rótulo oscura, piedra,
// naranja quemado / dorado, como en la app original de Muse.
"use client";
import { useEffect, useState } from "react";
import { DZIB_BREAKFAST, DZIB_DAILY_MENU_TODAY, DZIB_SETTINGS, DZIB_TABLES } from "@/data/dzib";
import { mxn, STATUS_LABEL, menuPriceForThird } from "@/lib/types";

const MENU = DZIB_DAILY_MENU_TODAY;
const TIEMPOS = ["primero", "segundo", "tercero"] as const;
type Tiempo = (typeof TIEMPOS)[number];
const TIEMPO_LABEL: Record<Tiempo, string> = { primero: "1er tiempo", segundo: "2º tiempo", tercero: "3er tiempo" };
const WATER = [
  { name: "Agua del día — vaso", priceCents: DZIB_SETTINGS.waterGlassPriceCents, label: "Vaso" },
  { name: "Agua del día — jarra 1 L", priceCents: DZIB_SETTINGS.waterJar1PriceCents, label: "Jarra 1 L" },
  { name: "Agua del día — jarra 2.5 L", priceCents: DZIB_SETTINGS.waterJar25PriceCents, label: "Jarra 2.5 L" },
];

type Extra = { key: string; name: string; priceCents: number };

function Accordion({ title, sub, open, onToggle, children }: { title: string; sub?: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="accordion">
      <button className="accordion-head" onClick={onToggle} type="button">
        <span>{title}{sub ? <div style={{ fontSize: 13, letterSpacing: ".08em", color: "#c9a227" }}>{sub}</div> : null}</span>
        <span className="chev">{open ? "▾" : "▸"}</span>
      </button>
      {open && <div className="accordion-body">{children}</div>}
    </div>
  );
}

function SubAcc({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className="sub-acc">
      <button className="sub-acc-head" onClick={onToggle} type="button"><span>{title}</span><span>{open ? "▾" : "▸"}</span></button>
      {open && <div className="sub-acc-body">{children}</div>}
    </div>
  );
}

export default function DzibPage({ searchParams }: { searchParams: { mesa?: string } }) {
  const mesa = Number(searchParams?.mesa);
  const table = DZIB_TABLES.find((t) => t.id === mesa);
  const [openSection, setOpenSection] = useState<"desayunos" | "comida" | "separado" | null>(() => {
    const now = new Date();
    return now.getHours() < 12 || (now.getHours() === 12 && now.getMinutes() <= 30) ? "desayunos" : "comida";
  });
  const [openTiempo, setOpenTiempo] = useState<Tiempo | null>("primero");
  const [openBreakfast, setOpenBreakfast] = useState<string | null>(null);
  const [sel, setSel] = useState<Record<Tiempo, any>>({ primero: null, segundo: null, tercero: null });
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extrasSent, setExtrasSent] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [account, setAccount] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [payMethod, setPayMethod] = useState<"terminal" | "efectivo" | null>(null);
  const [cash, setCash] = useState("");
  const [payResult, setPayResult] = useState<{ changeCents: number } | null>(null);

  // ---- Datos de la cuenta (para el panel de Status) ----
  async function fetchAccount(id: string) {
    if (!id) return;
    const res = await fetch(`/api/dzib/order?accountId=${id}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.account) setAccount(data.account);
  }
  useEffect(() => {
    if (!accountId) return;
    fetchAccount(accountId);
    const t = setInterval(() => fetchAccount(accountId), 5000);
    return () => clearInterval(t);
  }, [accountId]);

  const accItems: any[] = account?.items ?? [];
  const requested = (t: Tiempo) => accItems.some((i) => i.tiempo === t && i.status !== "espera");
  const served = (t: Tiempo) => accItems.some((i) => i.tiempo === t && i.status === "entregado");
  const tiempoStatus = (t: Tiempo): string => {
    const items = accItems.filter((i) => i.tiempo === t);
    if (items.length === 0) return sel[t] ? "Sin enviar" : "No elegido";
    if (items.every((i) => i.status === "entregado")) return "Entregado";
    if (items.some((i) => i.status === "listo")) return "Listo para recoger";
    if (items.some((i) => i.status === "preparando")) return "En preparación";
    if (items.some((i) => i.status === "pendiente")) return "En cocina";
    return "En espera";
  };
  const selectedTiempos = TIEMPOS.filter((t) => sel[t]);
  const nextToRequest = selectedTiempos.find((t) => !requested(t)) ?? null;
  const canRequest = (t: Tiempo) => {
    if (!sel[t] || requested(t) || !table) return false;
    const idx = TIEMPOS.indexOf(t);
    for (let i = 0; i < idx; i++) {
      if (sel[TIEMPOS[i]] && !served(TIEMPOS[i])) return false;
    }
    return true;
  };
  const blockedReason = (t: Tiempo) => {
    const idx = TIEMPOS.indexOf(t);
    for (let i = 0; i < idx; i++) {
      const prev = TIEMPOS[i];
      if (sel[prev] && !served(prev)) return `Se activa cuando te sirvan el ${TIEMPO_LABEL[prev]}.`;
    }
    return "";
  };
  const allSelectedRequested = selectedTiempos.length > 0 && selectedTiempos.every((t) => requested(t));
  const showPay = Boolean(accountId) && account?.status === "abierta" && (allSelectedRequested || (selectedTiempos.length === 0 && extrasSent));

  // Total de la selección (misma regla que en el servidor): el precio lo
  // define el 3er tiempo elegido ($91 con guisado de $79, $78 con pollo a
  // la pibil o ensaladas, $140–$190 con un especial). Sin los 3 tiempos,
  // se suma cada uno por separado (1er $0, 2º $26, 3er su precio solo).
  const selectionTotal = (() => {
    const corrida = selectedTiempos;
    const corridaTotal = corrida.length === 3
      ? menuPriceForThird(sel.tercero?.soloPriceCents ?? 0)
      : corrida.reduce((s, t) => s + (sel[t]?.soloPriceCents ?? 0), 0);
    return corridaTotal + extras.reduce((s, e) => s + e.priceCents, 0);
  })();
  const accountTotal = account?.totalCents ?? 0;
  const readyItems = accItems.filter((i) => i.status === "listo");
  const changeReady = Boolean(account?.changeReady) && account?.payment?.method === "efectivo";

  // ---- Acciones ----
  function addExtra(name: string, priceCents: number) {
    setExtras((prev) => [...prev, { key: `x-${Date.now()}-${prev.length}`, name, priceCents }]);
  }
  async function sendOrder(items: { name: string; priceCents: number; tiempo?: string | null }[]): Promise<string | null> {
    if (!table) { setMsg("Escanea el QR de tu mesa para pedir."); return null; }
    const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id, items }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? "No se pudo enviar el pedido"); return null; }
    setAccountId(data.accountId);
    return data.accountId as string;
  }
  async function pedirTiempo(t: Tiempo) {
    if (!sel[t]) { setMsg(`Primero elige tu ${TIEMPO_LABEL[t]}.`); return; }
    if (!canRequest(t)) { setMsg(blockedReason(t) || "Todavía no se puede pedir este tiempo."); return; }
    let id: string | null = accountId;
    if (!id) {
      const items = [
        ...selectedTiempos.map((tt) => ({ name: sel[tt].name, priceCents: sel[tt].soloPriceCents, tiempo: tt })),
        ...extras.map((e) => ({ name: e.name, priceCents: e.priceCents, tiempo: null })),
      ];
      id = await sendOrder(items);
      if (!id) return;
      setExtras([]); setExtrasSent(true);
    }
    const res = await fetch("/api/dzib/course", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: id, tiempo: t }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? "No se pudo pedir el tiempo"); return; }
    setMsg(`¡${TIEMPO_LABEL[t]} pedido! Cocina y tu mesero ya fueron avisados.`);
    fetchAccount(id);
  }
  async function sendExtras() {
    if (extras.length === 0) { setMsg("Agrega algo por separado primero."); return; }
    const items = extras.map((e) => ({ name: e.name, priceCents: e.priceCents, tiempo: null }));
    const id = accountId ? accountId : await sendOrder(items);
    if (!id) return;
    if (accountId) {
      const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: table!.id, items }) });
      if (!res.ok) { const d = await res.json().catch(() => null); setMsg(d?.error ?? "No se pudo enviar"); return; }
    }
    setExtras([]); setExtrasSent(true);
    setMsg("Pedido por separado enviado a cocina.");
    fetchAccount(id);
  }
  async function pagar() {
    if (!accountId || !payMethod) return;
    const cashCents = payMethod === "efectivo" ? Math.round(Number(cash || "0") * 100) : undefined;
    if (payMethod === "efectivo" && (!cashCents || cashCents < accountTotal)) { setMsg("El efectivo no cubre el total. Revisa con qué billete vas a pagar."); return; }
    const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", accountId, method: payMethod, cashCents }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? "No se pudo pedir la cuenta"); return; }
    setPayResult({ changeCents: data.changeCents ?? 0 });
    setMsg(payMethod === "efectivo"
      ? `Cuenta pedida. Tu cambio es ${mxn(data.changeCents ?? 0)}; el mesero lo trae en cuanto caja lo tenga listo.`
      : "Cuenta pedida. El mesero trae la terminal a tu mesa.");
    fetchAccount(accountId);
  }

  const sencillos = DZIB_BREAKFAST.filter((i) => i.category === "desayuno");
  const especiales = DZIB_BREAKFAST.filter((i) => i.category === "especial");
  const otras = DZIB_BREAKFAST.filter((i) => i.category === "otra");
  const extrasList = DZIB_BREAKFAST.filter((i) => i.category === "extra");
  const breakfastGroups = [
    { key: "sencillos", title: "Desayunos sencillos — $82", items: sencillos },
    { key: "especiales", title: "Desayunos especiales — $92", items: especiales },
    { key: "otras", title: "Otras opciones — $120 a $140", items: otras },
    { key: "extras", title: "Extras", items: extrasList },
  ];
  const addBtn = (name: string, priceCents: number) => table ? (
    <button type="button" onClick={() => addExtra(name, priceCents)}>Agregar</button>
  ) : null;

  const pagarPanel = showPay ? (
    <div className="card" style={{ marginTop: 14 }}>
      <b>Pagar — Total: {mxn(accountTotal)}</b>
      <p className="muted">¿Cómo pagas?</p>
      <div className="pay-row">
        <button type="button" className={payMethod === "terminal" ? "active" : ""} onClick={() => setPayMethod("terminal")}>💳 Tarjeta (terminal)</button>
        <button type="button" className={payMethod === "efectivo" ? "active" : ""} onClick={() => setPayMethod("efectivo")}>💵 Efectivo</button>
      </div>
      {payMethod === "efectivo" && (
        <>
          <label>¿Con qué billete vas a pagar?
            <input inputMode="numeric" placeholder="Ej. 200" value={cash} onChange={(e) => setCash(e.target.value)} />
          </label>
          <div className="cash-quick">
            {[100, 200, 500].map((b) => (
              <button key={b} type="button" onClick={() => setCash(String(b))}>${b}</button>
            ))}
            <button type="button" onClick={() => setCash(String(Math.ceil(accountTotal / 100)))}>Cantidad exacta ({mxn(accountTotal)})</button>
          </div>
          {cash && Number(cash) * 100 >= accountTotal && (
            <p><b>Tu cambio: {mxn(Number(cash) * 100 - accountTotal)}</b> — Caja prepara el cambio y avisa a tu mesero para que te lo lleve.</p>
          )}
          {cash && Number(cash) * 100 < accountTotal && <p className="danger">Esa cantidad no cubre el total de {mxn(accountTotal)}.</p>}
        </>
      )}
      {payMethod && (
        <button type="button" className="big-btn green" onClick={pagar}>Confirmar pago</button>
      )}
    </div>
  ) : null;

  const statusPanel = accountId ? (
    <div className="card" style={{ marginTop: 14 }}>
      <b>Estado de tu pedido — {account?.tableLabel}</b>
      {TIEMPOS.map((t) => (
        <div className="item" key={t}><span>{TIEMPO_LABEL[t]}{sel[t] ? ` · ${sel[t].name}` : accItems.find((i) => i.tiempo === t) ? ` · ${accItems.find((i) => i.tiempo === t).name}` : ""}</span><span className={`status-pill ${accItems.find((i) => i.tiempo === t)?.status ?? "espera"}`}>{tiempoStatus(t)}</span></div>
      ))}
      {accItems.filter((i) => !i.tiempo).map((i) => (
        <div className="item" key={i.id}><span>{i.name}</span><span className={`status-pill ${i.status}`}>{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</span></div>
      ))}
      <p><b>Total de tu cuenta: {mxn(accountTotal)}</b></p>
      <p> Pago: {account?.status === "cuenta-pedida" ? "Cuenta pedida — esperando a caja" : account?.status === "pagada" ? "Pagado ✓" : account?.status === "cerrada" ? "Cuenta cerrada" : "Pendiente (paga cuando termines tus tiempos)"}</p>
      {changeReady && <div className="alert green">¡Tu cambio ya está listo! El mesero va en camino con tu cambio.</div>}
      {account?.status === "cuenta-pedida" && account?.payment?.method === "efectivo" && !changeReady && (
        <p className="muted">Caja está preparando tu cambio de {mxn((account.payment.cashCents ?? 0) - accountTotal)}. Te avisamos aquí cuando esté listo.</p>
      )}
    </div>
  ) : null;

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
        {readyItems.length > 0 && (
          <div className="alert gold">¡Tu platillo está listo para recoger! {readyItems.map((i) => i.name).join(", ")} — el mesero ya fue avisado.</div>
        )}
        {changeReady && (
          <div className="alert green">¡Cambio listo! El mesero va en camino con tu cambio.</div>
        )}

        {/* ---------- DESAYUNOS ---------- */}
        <Accordion title="Desayunos" sub="Hasta las 12:30 pm" open={openSection === "desayunos"} onToggle={() => setOpenSection(openSection === "desayunos" ? null : "desayunos")}>
          <div className="item"><div><b>{DZIB_SETTINGS.guisadoDelDia}</b><div className="muted">Guisado de hoy</div></div><span>{mxn(DZIB_SETTINGS.guisadoPriceCents)} {addBtn(DZIB_SETTINGS.guisadoDelDia, DZIB_SETTINGS.guisadoPriceCents)}</span></div>
          <p className="muted">Desayunos sencillos incluyen café de olla o té, y jugo de naranja o fruta (papaya con plátano).</p>
          {breakfastGroups.map((g) => (
            <SubAcc key={g.key} title={g.title} open={openBreakfast === g.key} onToggle={() => setOpenBreakfast(openBreakfast === g.key ? null : g.key)}>
              {g.items.map((i) => (
                <div className="item" key={i.id}><div><b>{i.name}</b>{i.description && <div className="muted">{i.description}</div>}</div><span>{mxn(i.priceCents)} {addBtn(i.name, i.priceCents)}</span></div>
              ))}
            </SubAcc>
          ))}
          <p className="muted">Lo que agregues aquí se cobra por separado, a su precio individual.</p>
        </Accordion>

        {/* ---------- MENÚ DE COMIDA DEL DÍA ---------- */}
        <Accordion title="Menú de comida del día" sub="Menú sencillo de 3 tiempos · $91" open={openSection === "comida"} onToggle={() => setOpenSection(openSection === "comida" ? null : "comida")}>
          <p className="dzib-today"><b>Menú sencillo de 3 tiempos</b> (no incluye agua ni postre). Servicio de 1:30 pm a 7:00 pm. Todos nuestros precios incluyen IVA.</p>
          <p className="muted"><b>El precio lo define tu 3er tiempo:</b> menú de <b>$91</b> con los guisados (pescaditos, filete empanizado, sierra, ceviche…), menú de <b>$78</b> con pollo a la pibil y ensaladas, o el precio del especial que elijas ($140 a $190). El 1er y el 2º tiempo van <b>incluidos</b>. El 2º tiempo solo, fuera de la corrida, cuesta $26.</p>
          {TIEMPOS.map((t) => (
            <SubAcc key={t} title={`${TIEMPO_LABEL[t]}${t === "tercero" ? " · el precio define tu menú" : " · Incluido"}`} open={openTiempo === t} onToggle={() => setOpenTiempo(openTiempo === t ? null : t)}>
              {t === "primero" && <p className="muted">El 1er tiempo está incluido en el menú.</p>}
              {t === "segundo" && <p className="muted">El 2º tiempo está incluido en el menú. Solo, fuera de la corrida, cuesta $26.</p>}
              {MENU.items.filter((i) => i.tiempo === t).map((i) => {
                const chosen = sel[t]?.id === i.id;
                if (t === "tercero") {
                  const menuPrice = menuPriceForThird(i.soloPriceCents);
                  return (
                    <div className={`pick${chosen ? " selected" : ""}`} key={i.id} onClick={() => table && setSel({ ...sel, [t]: chosen ? null : i })} style={{ cursor: table ? "pointer" : "default" }}>
                      <div><span className="price-first">{mxn(menuPrice)}</span> <b>{i.name}</b>{chosen && <span className="sel-tag"> ✓ Elegido</span>}<div className="muted">Menú de {mxn(menuPrice)}{i.soloPriceCents !== menuPrice ? ` · Guisado solo ${mxn(i.soloPriceCents)}` : ""}</div></div>
                    </div>
                  );
                }
                return (
                  <div className={`pick${chosen ? " selected" : ""}`} key={i.id} onClick={() => table && setSel({ ...sel, [t]: chosen ? null : i })} style={{ cursor: table ? "pointer" : "default" }}>
                    <div><b>{i.name}</b>{chosen && <span className="sel-tag"> ✓ Elegido</span>}</div>
                    <span><b>Incluido</b></span>
                  </div>
                );
              })}
              <p className="muted">Toca un platillo para elegirlo (uno por tiempo). Toca de nuevo para quitarlo.</p>
            </SubAcc>
          ))}

          {/* Agua del día, dentro del menú de comida */}
          <div className="sub-acc">
            <div className="sub-acc-head"><span>Agua del día</span><span>Precio por confirmar</span></div>
            <div className="sub-acc-body">
              <p className="muted">Precios por confirmar con el restaurante (valores iniciales, no confirmados).</p>
              {WATER.map((w) => (
                <div className="item" key={w.name}><div><b>{w.label}</b><div className="muted">Agua del día</div></div><span>{mxn(w.priceCents)} · Precio por confirmar {addBtn(w.name, w.priceCents)}</span></div>
              ))}
            </div>
          </div>

          {/* Tu menú + botones grandes */}
          <div className="card" style={{ marginTop: 14 }}>
            <b>Tu menú{selectedTiempos.length === 3 ? `: ${mxn(selectionTotal)}` : ""} — {table?.label ?? "sin mesa"}</b>
            {selectedTiempos.length === 0 ? (
              <p className="muted">Elige un platillo por tiempo arriba para armar tu menú.</p>
            ) : (
              TIEMPOS.map((t) => sel[t] && (
                <div className="item" key={t}><span>{TIEMPO_LABEL[t]} · {sel[t].name}</span><span>{t === "tercero" ? mxn(menuPriceForThird(sel[t].soloPriceCents)) : "Incluido"} {requested(t) ? "· Pedido ✓" : ""}</span></div>
              ))
            )}
            {extras.length > 0 && extras.map((e) => (
              <div className="item" key={e.key}><span>{e.name} (por separado)</span><span>{mxn(e.priceCents)} <button type="button" onClick={() => setExtras(extras.filter((x) => x.key !== e.key))}>Quitar</button></span></div>
            ))}
            <p><b>{selectedTiempos.length === 3 ? `Tu menú: ${mxn(selectionTotal)}` : `Total de tu selección: ${mxn(selectionTotal)}`}</b>{selectedTiempos.length === 3 ? ` · El precio lo definió tu 3er tiempo (${sel.tercero?.name})` : ""}</p>
            {table && nextToRequest && (
              <>
                <button type="button" className="big-btn" disabled={!canRequest(nextToRequest)} onClick={() => pedirTiempo(nextToRequest)}>
                  Pedir {TIEMPO_LABEL[nextToRequest].toLowerCase()}
                </button>
                {!canRequest(nextToRequest) && <p className="muted">{blockedReason(nextToRequest)}</p>}
              </>
            )}
            {table && !nextToRequest && selectedTiempos.length > 0 && (
              <p><b>Tus tiempos ya están pedidos ✓</b> — baja a Pagar cuando quieras.</p>
            )}
            {!table && <p className="muted">Escanea el QR de tu mesa para pedir.</p>}
          </div>
          {pagarPanel}
          {statusPanel}
        </Accordion>

        {/* ---------- PEDIR POR SEPARADO ---------- */}
        <Accordion title="Pedir por separado" sub="A la carta · precio individual" open={openSection === "separado"} onToggle={() => setOpenSection(openSection === "separado" ? null : "separado")}>
          <p className="muted">Cualquier platillo por su precio individual, fuera del menú sencillo. Se envía directo a cocina.</p>
          <SubAcc title="Desayunos" open={openBreakfast === "sep-des"} onToggle={() => setOpenBreakfast(openBreakfast === "sep-des" ? null : "sep-des")}>
            {DZIB_BREAKFAST.filter((i) => i.category !== "extra").map((i) => (
              <div className="item" key={i.id}><div><b>{i.name}</b>{i.description && <div className="muted">{i.description}</div>}</div><span>{mxn(i.priceCents)} {addBtn(i.name, i.priceCents)}</span></div>
            ))}
          </SubAcc>
          <SubAcc title="Comida suelta — por tiempo" open={openBreakfast === "sep-comida"} onToggle={() => setOpenBreakfast(openBreakfast === "sep-comida" ? null : "sep-comida")}>
            {MENU.items.map((i) => (
              <div className="item" key={i.id}><div><b>{i.name}</b><div className="muted">{TIEMPO_LABEL[i.tiempo as Tiempo]}</div></div><span>{i.soloPriceCents === 0 ? "En menú sencillo" : mxn(i.soloPriceCents)} {i.soloPriceCents > 0 ? addBtn(i.name, i.soloPriceCents) : null}</span></div>
            ))}
          </SubAcc>
          <SubAcc title="Agua del día y extras" open={openBreakfast === "sep-agua"} onToggle={() => setOpenBreakfast(openBreakfast === "sep-agua" ? null : "sep-agua")}>
            {WATER.map((w) => (
              <div className="item" key={w.name}><div><b>{w.label}</b><div className="muted">Agua del día · Precio por confirmar</div></div><span>{mxn(w.priceCents)} {addBtn(w.name, w.priceCents)}</span></div>
            ))}
            {extrasList.map((i) => (
              <div className="item" key={i.id}><div><b>{i.name}</b></div><span>{mxn(i.priceCents)} {addBtn(i.name, i.priceCents)}</span></div>
            ))}
          </SubAcc>
          <div className="card" style={{ marginTop: 14 }}>
            <b>Tu pedido por separado</b>
            {extras.length === 0 ? <p className="muted">Todavía no agregaste nada por separado.</p> : (
              <>
                {extras.map((e) => (
                  <div className="item" key={e.key}><span>{e.name}</span><span>{mxn(e.priceCents)} <button type="button" onClick={() => setExtras(extras.filter((x) => x.key !== e.key))}>Quitar</button></span></div>
                ))}
                <p><b>Total por separado: {mxn(extras.reduce((s, e) => s + e.priceCents, 0))}</b></p>
                <button type="button" className="big-btn" onClick={sendExtras}>Enviar pedido a cocina</button>
              </>
            )}
          </div>
          {pagarPanel}
          {statusPanel}
        </Accordion>

        {msg && <p>{msg}</p>}
        {payResult && account?.status === "cuenta-pedida" && (
          <div className="alert green">Cuenta pedida. {account?.payment?.method === "efectivo" ? `Tu cambio es ${mxn(payResult.changeCents)}.` : "El mesero trae la terminal."}</div>
        )}
        <p><a href="/dzib/personal">Personal</a></p>
      </main>
    </div>
  );
}
