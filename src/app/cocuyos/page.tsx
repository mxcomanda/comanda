// /cocuyos — vista del comensal. Acceso solo por QR de mesa (?mesa=N).
// Bilingüe completo (ES | EN, con interruptor en el encabezado, guardado
// en localStorage, ES por defecto). Todo se pide a la carta y va directo
// a cocina (comida) o a barra (bebidas), sin corridas ni tiempos.
// Segmentación en 3 caminos: Para comer / Para tomar / Postres; dentro
// de cada camino, categorías en chips + filtro rápido 🌱 Vegetariano.
// Los ítems con precio por confirmar se muestran pero NO se pueden pedir.
// El panel "Tu pedido" vive FIJO en una columna lateral derecha (en
// celular se abre con un botón flotante "Tu pedido" como hoja
// superpuesta); el botón flotante cambia a "Confirma tu pedido" en rojo
// y parpadeando mientras haya algo sin enviar. El total y el pago solo
// aparecen cuando TODO lo pedido ya se entregó. Diseño Los Cocuyos:
// rojo #D5001C, negro, dorado #FFC400 y crema, sobre las clases de
// layout de Dzib (envoltorio "dzib cocuyos").
"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { COCUYOS_CATEGORIES, COCUYOS_MENU, COCUYOS_META, COCUYOS_TABLES, cocuyosItemsForCategory, type CocuyosCategoryId, type CocuyosItem, type CocuyosPath } from "@/data/cocuyos";
import { mxn, STATUS_LABEL } from "@/lib/types";

type Lang = "es" | "en";
const LANG_KEY = "cocuyos-lang";

const T: Record<Lang, Record<string, string>> = {
  es: {
    tagline: "Los mejores tacos para ti",
    distinction: "Bib Gourmand en México — Guía Michelin",
    press: "Como en Netflix: La Ruta de la Garnacha y Las Crónicas del Taco",
    since: "Desde 1990",
    craving: "¿Qué se te antoja?",
    cravingSub: "Elige un camino y arma tu pedido",
    comer: "Para comer",
    comerSub: "Tacos, gringas, tortas y más",
    tomar: "Para tomar",
    tomarSub: "Refrescos, cervezas y coctelería",
    postres: "Postres",
    postresSub: "Para cerrar con algo dulce",
    back: "← Cambiar de camino",
    vegFilter: "🌱 Vegetariano",
    vegOnly: "Solo opciones vegetarianas",
    noVeg: "No hay opciones vegetarianas en este camino.",
    noItems: "Todavía no hay platillos en esta categoría.",
    scanQr: "Escanea el código QR de tu mesa para pedir. Sin QR solo puedes ver el menú.",
    orderingFor: "Estás pidiendo para",
    orderSaved: "Tu pedido se guarda en la mesa: si cambias de celular, ábrelo con el mismo QR y sigue donde ibas.",
    add: "Agregar",
    remove: "Quitar",
    pricePending: "Precio por confirmar",
    yourOrder: "Tu pedido",
    total: "Total",
    noPending: "Todavía no agregaste nada.",
    sent: "Enviados ✓",
    pendingTitle: "Por enviar",
    notesPh: "Indicaciones especiales (opcional)",
    notesEx: "Ej. sin cebolla",
    sendToKitchen: "Enviar pedido a cocina",
    sendFirst: "Agrega algo primero.",
    orderSent: "¡Pedido enviado! Cocina y barra ya fueron avisados.",
    orderFailed: "No se pudo enviar el pedido",
    readyAlert: "¡Tu pedido está listo para recoger! El mesero ya fue avisado.",
    changeReady: "¡Cambio listo! El mesero va en camino con tu cambio.",
    payTitle: "Pagar — Total de tu cuenta:",
    card: "💳 Tarjeta (terminal)",
    cash: "💵 Efectivo",
    cashQ: "¿Con qué billete vas a pagar?",
    cashEx: "Ej. 200",
    exact: "Cantidad exacta",
    yourChange: "Tu cambio:",
    changeNote: "Caja prepara el cambio y avisa a tu mesero para que te lo lleve.",
    notEnough: "Esa cantidad no cubre el total de",
    confirmPay: "Confirmar pago",
    payCardMsg: "Cuenta pedida. El mesero trae la terminal a tu mesa.",
    payCashMsg: "Cuenta pedida. Tu cambio es",
    payFail: "No se pudo pedir la cuenta",
    cashShort: "El efectivo no cubre el total. Revisa con qué billete vas a pagar.",
    waiter: "🔔 Asistencia mesero",
    waiterComing: "Mesero en camino…",
    waiterOk: "¡Listo! Tu mesero va en camino.",
    waiterFail: "No se pudo llamar al mesero",
    staff: "Personal",
    kitchenTag: "Cocina",
    barTag: "Barra",
    accountRequested: "Cuenta pedida.",
    tableLabel: "Mesa",
    withoutTable: "sin mesa",
    unconfirmedTotal: "Total sin enviar:",
    sentTotal: "Total de tu cuenta:",
  },
  en: {
    tagline: "Best tacos for you",
    distinction: "Bib Gourmand in Mexico — Michelin Guide",
    press: "As seen on Netflix: La Ruta de la Garnacha and Las Crónicas del Taco",
    since: "Since 1990",
    craving: "What are you craving?",
    cravingSub: "Pick a path and build your order",
    comer: "To eat",
    comerSub: "Tacos, gringas, tortas and more",
    tomar: "To drink",
    tomarSub: "Soft drinks, beer and cocktails",
    postres: "Desserts",
    postresSub: "To finish with something sweet",
    back: "← Change path",
    vegFilter: "🌱 Vegetarian",
    vegOnly: "Vegetarian options only",
    noVeg: "There are no vegetarian options on this path.",
    noItems: "There are no dishes in this category yet.",
    scanQr: "Scan your table's QR code to order. Without a QR you can only see the menu.",
    orderingFor: "You are ordering for",
    orderSaved: "Your order is saved to the table: switch phones, scan the same QR and pick up where you left off.",
    add: "Add",
    remove: "Remove",
    pricePending: "Price to confirm",
    yourOrder: "Your order",
    total: "Total",
    noPending: "You haven't added anything yet.",
    sent: "Sent ✓",
    pendingTitle: "To send",
    notesPh: "Special instructions (optional)",
    notesEx: "E.g. no onions",
    sendToKitchen: "Send order to kitchen",
    sendFirst: "Add something first.",
    orderSent: "Order sent! Kitchen and bar have been notified.",
    orderFailed: "Could not send the order",
    readyAlert: "Your order is ready to pick up! Your waiter has been notified.",
    changeReady: "Change is ready! Your waiter is on the way with your change.",
    payTitle: "Pay — Your bill total:",
    card: "💳 Card (terminal)",
    cash: "💵 Cash",
    cashQ: "What bill will you pay with?",
    cashEx: "E.g. 200",
    exact: "Exact amount",
    yourChange: "Your change:",
    changeNote: "The cashier prepares your change and tells your waiter to bring it.",
    notEnough: "That amount does not cover the total of",
    confirmPay: "Confirm payment",
    payCardMsg: "Bill requested. Your waiter is bringing the card terminal to your table.",
    payCashMsg: "Bill requested. Your change is",
    payFail: "Could not request the bill",
    cashShort: "The cash does not cover the total. Check what bill you will pay with.",
    waiter: "🔔 Waiter assistance",
    waiterComing: "Waiter on the way…",
    waiterOk: "Done! Your waiter is on the way.",
    waiterFail: "Could not call the waiter",
    staff: "Staff",
    kitchenTag: "Kitchen",
    barTag: "Bar",
    accountRequested: "Bill requested.",
    tableLabel: "Table",
    withoutTable: "no table",
    unconfirmedTotal: "Unsent total:",
    sentTotal: "Your bill total:",
  },
};

const STATUS_LABEL_EN: Record<string, string> = {
  espera: "Waiting",
  pendiente: "In the kitchen",
  preparando: "Being prepared",
  listo: "Ready to pick up",
  entregado: "Served",
  cancelado: "Cancelled",
};

const PATHS: { id: CocuyosPath; icon: string }[] = [
  { id: "comer", icon: "🌮" },
  { id: "tomar", icon: "🍹" },
  { id: "postres", icon: "🍮" },
];

type Pending = { id: number; qty: number; notes: string };

export default function CocuyosPage({ searchParams }: { searchParams: { mesa?: string } }) {
  const mesa = Number(searchParams?.mesa);
  const table = COCUYOS_TABLES.find((t) => t.id === mesa);
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "es";
    try { return (localStorage.getItem(LANG_KEY) as Lang) === "en" ? "en" : "es"; } catch { return "es"; }
  });
  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignorar */ }
  }, [lang]);
  const t = (k: string) => T[lang][k] ?? T.es[k] ?? k;
  const statusLabel = (s: string) => (lang === "en" ? STATUS_LABEL_EN[s] ?? s : STATUS_LABEL[s as keyof typeof STATUS_LABEL] ?? s);

  const [path, setPath] = useState<CocuyosPath | null>(null);
  const [category, setCategory] = useState<CocuyosCategoryId | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [pending, setPending] = useState<Pending[]>([]);
  const [pedidoOpen, setPedidoOpen] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [account, setAccount] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [payMethod, setPayMethod] = useState<"terminal" | "efectivo" | null>(null);
  const [cash, setCash] = useState("");
  const [payResult, setPayResult] = useState<{ changeCents: number } | null>(null);
  const [assistanceCall, setAssistanceCall] = useState<any>(null);
  const [assistanceBusy, setAssistanceBusy] = useState(false);

  const pathCategories = COCUYOS_CATEGORIES.filter((c) => c.path === (path ?? "comer"));
  // Al entrar a un camino, la primera categoría queda seleccionada.
  useEffect(() => {
    if (path) setCategory(pathCategories[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  const activeCategory = COCUYOS_CATEGORIES.find((c) => c.id === category) ?? pathCategories[0];
  const isVeg = (item: CocuyosItem) =>
    (item.tags ?? []).includes("vegetariano") || (item.alsoIn ?? []).includes("vegetariano");
  // Lista visible: con el filtro 🌱, todas las vegetarianas del camino;
  // si no, los ítems de la categoría elegida (incluidos los alsoIn).
  const visibleItems: CocuyosItem[] = vegOnly
    ? COCUYOS_MENU.filter((i) => COCUYOS_CATEGORIES.find((c) => c.id === i.category)?.path === path && isVeg(i))
    : activeCategory ? cocuyosItemsForCategory(activeCategory.id) : [];

  // ---- Datos de la cuenta ----
  async function fetchAccount(id: string) {
    if (!id) return;
    const res = await fetch(`/api/cocuyos/order?accountId=${id}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.account) setAccount(data.account);
  }
  useEffect(() => {
    if (!table) return;
    fetch(`/api/cocuyos/order?tableId=${table.id}`).then(async (r) => {
      const data = await r.json().catch(() => null);
      if (data?.account) { setAccountId(data.account.id); setAccount(data.account); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id]);
  useEffect(() => {
    if (!accountId) return;
    fetchAccount(accountId);
    const iv = setInterval(() => fetchAccount(accountId), 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  // ---- Asistencia al mesero ----
  async function fetchAssistance() {
    if (!table) return;
    const res = await fetch(`/api/cocuyos/assistance?tableId=${table.id}`);
    const data = await res.json().catch(() => null);
    if (res.ok) setAssistanceCall(data?.call ?? null);
  }
  useEffect(() => {
    if (!table) return;
    fetchAssistance();
    const iv = setInterval(fetchAssistance, 5000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id]);
  async function callWaiter() {
    if (!table || assistanceCall || assistanceBusy) return;
    setAssistanceBusy(true);
    const res = await fetch("/api/cocuyos/assistance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tableId: table.id }) });
    const data = await res.json().catch(() => null);
    setAssistanceBusy(false);
    if (!res.ok) { setMsg(data?.error ?? t("waiterFail")); return; }
    setAssistanceCall(data.call);
    setMsg(t("waiterOk"));
  }

  const accItems: any[] = account?.items ?? [];
  const accountTotal = account?.totalCents ?? 0;
  const pendingTotal = pending.reduce((s, p) => {
    const item = COCUYOS_MENU.find((i) => i.id === p.id);
    return s + (item?.priceCents ?? 0) * p.qty;
  }, 0);
  const grandTotal = accountTotal + pendingTotal;
  const readyItems = accItems.filter((i) => i.status === "listo");
  const changeReady = Boolean(account?.changeReady) && account?.payment?.method === "efectivo";
  // El total y el pago solo aparecen cuando TODO lo pedido ya se entregó.
  const allDelivered = accItems.length > 0 && accItems.every((i) => i.status === "entregado" || i.status === "cancelado");
  const showPay = Boolean(accountId) && account?.status === "abierta" && pending.length === 0 && allDelivered;
  const hasPendingToConfirm = pending.length > 0;

  // ---- Acciones ----
  function pendingOf(id: number) { return pending.find((p) => p.id === id); }
  function addItem(item: CocuyosItem) {
    if (!table || item.priceCents === null) return;
    setPending((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) return prev.map((p) => (p === found ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { id: item.id, qty: 1, notes: "" }];
    });
  }
  function changeQty(id: number, delta: number) {
    setPending((prev) => {
      const found = prev.find((p) => p.id === id);
      if (!found) return prev;
      const qty = found.qty + delta;
      if (qty <= 0) return prev.filter((p) => p !== found);
      return prev.map((p) => (p === found ? { ...p, qty } : p));
    });
  }
  function setNotes(id: number, notes: string) {
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, notes } : p)));
  }
  async function sendOrder() {
    if (!table) { setMsg(t("scanQr")); return; }
    if (pending.length === 0) { setMsg(t("sendFirst")); return; }
    const res = await fetch("/api/cocuyos/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id, items: pending.map((p) => ({ id: p.id, qty: p.qty, notes: p.notes.trim() || null })) }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? t("orderFailed")); return; }
    setPending([]);
    setAccountId(data.accountId);
    setMsg(t("orderSent"));
    fetchAccount(data.accountId);
  }
  async function pagar() {
    if (!accountId || !payMethod) return;
    const cashCents = payMethod === "efectivo" ? Math.round(Number(cash || "0") * 100) : undefined;
    if (payMethod === "efectivo" && (!cashCents || cashCents < accountTotal)) { setMsg(t("cashShort")); return; }
    const res = await fetch("/api/cocuyos/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", accountId, method: payMethod, cashCents }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? t("payFail")); return; }
    setPayResult({ changeCents: data.changeCents ?? 0 });
    setMsg(payMethod === "efectivo" ? `${t("payCashMsg")} ${mxn(data.changeCents ?? 0)}.` : t("payCardMsg"));
    fetchAccount(accountId);
  }

  const itemName = (i: CocuyosItem) => (lang === "en" ? i.nameEn : i.nameEs);
  const itemDesc = (i: CocuyosItem) => (lang === "en" ? i.descEn : i.descEs);
  const catName = (c: { nameEs: string; nameEn: string }) => (lang === "en" ? c.nameEn : c.nameEs);
  const catNote = (c: { noteEs?: string; noteEn?: string }) => (lang === "en" ? c.noteEn : c.noteEs);

  const itemRow = (item: CocuyosItem) => {
    const p = pendingOf(item.id);
    const noPrice = item.priceCents === null;
    return (
      <div className="item" key={item.id}>
        <div>
          <b>{itemName(item)}</b>
          {itemDesc(item) && <div className="muted">{itemDesc(item)}</div>}
          <div className="muted" style={{ fontSize: 12 }}>{item.station === "barra" ? t("barTag") : t("kitchenTag")}</div>
        </div>
        <span style={{ textAlign: "right", whiteSpace: "nowrap" }}>
          {noPrice ? <span className="muted">{t("pricePending")}</span> : mxn(item.priceCents ?? 0)}{" "}
          {!noPrice && table && !p && <button type="button" onClick={() => addItem(item)}>{t("add")}</button>}
          {!noPrice && table && p && (
            <>
              <button type="button" onClick={() => changeQty(item.id, -1)} aria-label={t("remove")}>−</button>
              <b style={{ margin: "0 6px" }}>×{p.qty}</b>
              <button type="button" onClick={() => changeQty(item.id, 1)} aria-label={t("add")}>＋</button>
            </>
          )}
        </span>
      </div>
    );
  };

  const pagarPanel = showPay ? (
    <div className="card" style={{ marginTop: 14 }}>
      <b>{t("payTitle")} {mxn(accountTotal)}</b>
      <div className="pay-row">
        <button type="button" className={payMethod === "terminal" ? "active" : ""} onClick={() => setPayMethod("terminal")}>{t("card")}</button>
        <button type="button" className={payMethod === "efectivo" ? "active" : ""} onClick={() => setPayMethod("efectivo")}>{t("cash")}</button>
      </div>
      {payMethod === "efectivo" && (
        <>
          <label>{t("cashQ")}
            <input inputMode="numeric" placeholder={t("cashEx")} value={cash} onChange={(e) => setCash(e.target.value)} />
          </label>
          <div className="cash-quick">
            {[100, 200, 500].map((b) => (
              <button key={b} type="button" onClick={() => setCash(String(b))}>${b}</button>
            ))}
            <button type="button" onClick={() => setCash(String(Math.ceil(accountTotal / 100)))}>{t("exact")} ({mxn(accountTotal)})</button>
          </div>
          {cash && Number(cash) * 100 >= accountTotal && (
            <p><b>{t("yourChange")} {mxn(Number(cash) * 100 - accountTotal)}</b> — {t("changeNote")}</p>
          )}
          {cash && Number(cash) * 100 < accountTotal && <p className="danger">{t("notEnough")} {mxn(accountTotal)}.</p>}
        </>
      )}
      {payMethod && (
        <button type="button" className="big-btn green" onClick={pagar}>{t("confirmPay")}</button>
      )}
    </div>
  ) : null;

  return (
    <div className="dzib cocuyos">
      <header className="dzib-header cocuyos-header">
        <div className="dzib-header-inner" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Image src="/los-cocuyos-logo.svg" alt="Taquería Los Cocuyos — desde 1990" width={92} height={92} priority />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="dzib-brand">LOS COCUYOS</div>
            <div className="dzib-sub">{t("tagline")} · {t("since")}</div>
            <div style={{ fontSize: 13, marginTop: 4, color: "#ffe9a8" }}>★ {t("distinction")}</div>
          </div>
          <div className="lang-toggle" role="group" aria-label="Idioma / Language">
            <button type="button" className={lang === "es" ? "active" : ""} onClick={() => setLang("es")}>ES</button>
            <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
          </div>
        </div>
      </header>
      <main className="wrap dzib-layout">
        <div className="dzib-menu-col">
        {!table ? (
          <p className="danger">{t("scanQr")}</p>
        ) : (
          <p><span className="badge">{table.label}</span> {t("orderingFor")} {table.label}. {t("orderSaved")}</p>
        )}
        {readyItems.length > 0 && (
          <div className="alert gold">{t("readyAlert")} {readyItems.map((i) => i.name).join(", ")}</div>
        )}
        {changeReady && (
          <div className="alert green">{t("changeReady")}</div>
        )}

        {/* ---------- 3 CAMINOS ---------- */}
        {!path ? (
          <>
            <h2 style={{ marginTop: 8 }}>{t("craving")}</h2>
            <p className="muted">{t("cravingSub")}</p>
            <div className="grid2" style={{ marginTop: 12 }}>
              {PATHS.map((p) => (
                <button key={p.id} type="button" className="path-card" onClick={() => setPath(p.id)}>
                  <span className="path-icon" aria-hidden="true">{p.icon}</span>
                  <span className="path-title">{t(p.id)}</span>
                  <span className="path-sub">{t(`${p.id}Sub`)}</span>
                </button>
              ))}
            </div>
            <p className="muted" style={{ marginTop: 16 }}>{t("press")}</p>
          </>
        ) : (
          <>
            <p><button type="button" onClick={() => { setPath(null); setVegOnly(false); }}>{t("back")}</button></p>
            <h2 style={{ marginTop: 8 }}>{t(path)}</h2>
            {/* Filtro rápido vegetariano */}
            <div className="pay-row">
              <button type="button" className={vegOnly ? "picked" : ""} onClick={() => setVegOnly(!vegOnly)}>{t("vegFilter")}{vegOnly ? " ✓" : ""}</button>
            </div>
            {vegOnly && <p className="muted">{t("vegOnly")}</p>}
            {/* Chips de categoría */}
            {!vegOnly && (
              <div className="corrida-tabs">
                {pathCategories.map((c) => (
                  <button key={c.id} type="button" className={activeCategory?.id === c.id ? "active" : ""} onClick={() => setCategory(c.id)}>
                    {catName(c)}
                  </button>
                ))}
              </div>
            )}
            {activeCategory && !vegOnly && catNote(activeCategory) && (
              <p className="muted">{catNote(activeCategory)}</p>
            )}
            {visibleItems.length === 0 ? (
              <p className="muted">{vegOnly ? t("noVeg") : t("noItems")}</p>
            ) : (
              visibleItems.map(itemRow)
            )}
          </>
        )}

        {msg && <p>{msg}</p>}
        {payResult && account?.status === "cuenta-pedida" && (
          <div className="alert green">{t("accountRequested")} {account?.payment?.method === "efectivo" ? `${t("yourChange")} ${mxn(payResult.changeCents)}.` : ""}</div>
        )}
        <p><a href="/cocuyos/personal">{t("staff")}</a></p>
        </div>

        <aside className={`dzib-pedido-aside${pedidoOpen ? " abierto" : ""}`}>
          <div className="pedido-aside-head">
            <b>{t("yourOrder")}</b>
            {table && <span className="badge">{table.label}</span>}
            <span className="pedido-aside-total">{t("total")}: {mxn(grandTotal)}</span>
            <button type="button" className="pedido-close" onClick={() => setPedidoOpen(false)} aria-label="Cerrar pedido">✕</button>
          </div>
          <div className="card" style={{ marginTop: 18 }}>
            <b>{t("yourOrder")} — {table?.label ?? t("withoutTable")}</b>
            {accItems.length > 0 && (
              <>
                <p style={{ marginTop: 10 }}><b>{t("sent")}</b></p>
                {accItems.map((i: any) => (
                  <div key={i.id}>
                    <div className="item">
                      <span>{i.name}{i.qty > 1 ? ` ×${i.qty}` : ""} <span className="muted">· {i.station === "barra" ? t("barTag") : t("kitchenTag")}</span></span>
                      <span className={`status-pill ${i.status}`}>{statusLabel(i.status)}</span>
                    </div>
                    {i.notes && <p className="notes-line">⚠ {i.notes}</p>}
                  </div>
                ))}
              </>
            )}
            {pending.length > 0 && (
              <>
                <p style={{ marginTop: 10 }}><b>{t("pendingTitle")}</b></p>
                {pending.map((p) => {
                  const item = COCUYOS_MENU.find((i) => i.id === p.id)!;
                  return (
                    <div key={p.id}>
                      <div className="item">
                        <span>{itemName(item)}{p.qty > 1 ? ` ×${p.qty}` : ""}</span>
                        <span>{mxn((item.priceCents ?? 0) * p.qty)} <button type="button" onClick={() => setPending(pending.filter((x) => x.id !== p.id))}>{t("remove")}</button></span>
                      </div>
                      <input placeholder={`${t("notesPh")} — ${t("notesEx")}`} value={p.notes} onChange={(e) => setNotes(p.id, e.target.value)} style={{ margin: "4px 0 10px" }} />
                    </div>
                  );
                })}
              </>
            )}
            {pending.length === 0 && accItems.length === 0 && (
              <p className="muted">{t("noPending")}</p>
            )}
            {pending.length > 0 && (
              <>
                <p><b>{t("unconfirmedTotal")} {mxn(pendingTotal)}</b></p>
                <button type="button" className="big-btn parpadea-pedir" onClick={sendOrder}>{t("sendToKitchen")}</button>
              </>
            )}
            {accItems.length > 0 && <p><b>{t("sentTotal")} {mxn(accountTotal)}</b></p>}
          </div>
          {pagarPanel}
        </aside>
      </main>
      {pedidoOpen && <div className="pedido-backdrop" onClick={() => setPedidoOpen(false)} aria-hidden="true" />}
      {table && (
        <button type="button" className={hasPendingToConfirm ? "pedido-fab confirma" : "pedido-fab"} onClick={() => setPedidoOpen(true)}>
          {hasPendingToConfirm ? (lang === "en" ? "❗ Confirm your order" : "❗ Confirma tu pedido") : <>🧾 {t("yourOrder")}{grandTotal > 0 ? ` · ${mxn(grandTotal)}` : ""}</>}
        </button>
      )}
      {table && (
        <button type="button" className="fab-waiter" disabled={Boolean(assistanceCall) || assistanceBusy} onClick={callWaiter}>
          {assistanceCall || assistanceBusy ? t("waiterComing") : t("waiter")}
        </button>
      )}
    </div>
  );
}
