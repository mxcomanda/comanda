// /dzib — vista del comensal. Acceso solo por QR de mesa (?mesa=N).
// Submenús desplegables: Desayunos (hasta 12:30 pm), Menú de comida del
// día (por tiempos) y Pedir por separado. La mesa puede pedir MÁS DE UNA
// comida corrida: cada corrida es un grupo independiente con su propio
// avance 1º → 2º → 3º (botones grandes por corrida), pero el total se paga
// junto en una sola cuenta. El panel "Tu pedido" vive FUERA de los
// acordeones, hasta abajo, y una barra superior fija muestra en todo
// momento lo que se está pidiendo. El pedido NO se pierde al cambiar de
// dispositivo: al abrir con el QR se carga la cuenta abierta de la mesa
// desde Postgres (única fuente de verdad). Diseño Dzib: banda rótulo
// oscura, piedra, naranja quemado / dorado.
"use client";
import { useEffect, useState } from "react";
import { DZIB_BREAKFAST, DZIB_DAILY_MENU_TODAY, DZIB_SETTINGS, DZIB_TABLES } from "@/data/dzib";
import { mxn, STATUS_LABEL, menuPriceForThird } from "@/lib/types";

const MENU = DZIB_DAILY_MENU_TODAY;
const TIEMPOS = ["primero", "segundo", "tercero"] as const;
type Tiempo = (typeof TIEMPOS)[number];
const TIEMPO_LABEL: Record<Tiempo, string> = { primero: "1er tiempo", segundo: "2º tiempo", tercero: "3er tiempo" };
// Texto de los botones grandes del flujo (el primero dice "Empezar con
// primer tiempo", como pidió Cesar).
const REQUEST_LABEL: Record<Tiempo, string> = { primero: "Empezar con primer tiempo", segundo: "Pedir segundo tiempo", tercero: "Pedir tercer tiempo" };
const WATER = [
  { name: "Agua del día — vaso", priceCents: DZIB_SETTINGS.waterGlassPriceCents, label: "Vaso" },
  { name: "Agua del día — jarra 1 L", priceCents: DZIB_SETTINGS.waterJar1PriceCents, label: "Jarra 1 L" },
  { name: "Agua del día — jarra 2.5 L", priceCents: DZIB_SETTINGS.waterJar25PriceCents, label: "Jarra 2.5 L" },
];

type Extra = { key: string; name: string; priceCents: number; detail?: string; notes?: string; group?: "desayuno" | "separado" };
type Sel = Record<Tiempo, any>;
const emptySel = (): Sel => ({ primero: null, segundo: null, tercero: null });
// Bebida y acompañamiento incluidos en los desayunos sencillos ($82).
const DRINKS = ["Café de olla", "Té"] as const;
const SIDES = ["Jugo de naranja", "Fruta (papaya con plátano)"] as const;

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
  // Corridas en borrador (todavía no enviadas a cocina). Cada una tiene su
  // propia selección por tiempo. Cuando se pide su 1er tiempo, sus
  // platillos se envían a la cuenta y el borrador desaparece (la corrida
  // ya vive en la cuenta, que es la fuente de verdad).
  const [drafts, setDrafts] = useState<{ id: number; sel: Sel }[]>([{ id: 1, sel: emptySel() }]);
  // Corrida que está armando el comensal en el acordeón de comida.
  const [editingId, setEditingId] = useState(1);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extrasSent, setExtrasSent] = useState(false);
  // Elección de bebida/acompañamiento de un desayuno sencillo o del
  // guisado del día: qué platillo tiene el selector abierto y qué lleva
  // elegido (por defecto, café de olla + jugo de naranja). Solo los
  // sencillos y el guisado incluyen esto.
  const [breakfastPick, setBreakfastPick] = useState<{ id: number | string; drink: string; side: string } | null>(null);
  // Texto del ingrediente extra (hay que escribirlo para poder agregarlo).
  const [extraIngredientText, setExtraIngredientText] = useState("");
  // Indicaciones especiales por tiempo de cada corrida: clave
  // "corridaId:tiempo" (ej. "1:segundo" → "sin cebolla y sin cilantro").
  // Viajan con el platillo a cocina cuando se pide ese tiempo.
  const [tiempoNotes, setTiempoNotes] = useState<Record<string, string>>({});
  const [accountId, setAccountId] = useState("");
  const [account, setAccount] = useState<any>(null);
  const [msg, setMsg] = useState("");
  // Asistencia al mesero: botón circular fijo. La llamada queda guardada
  // y meseros la ve con vibración/bip/banner; el botón muestra "Mesero
  // en camino" hasta que la atiendan (se consulta cada 5 s, igual que
  // el resto del pedido).
  const [assistanceCall, setAssistanceCall] = useState<any>(null);
  const [assistanceBusy, setAssistanceBusy] = useState(false);
  async function fetchAssistance() {
    if (!table) return;
    const res = await fetch(`/api/dzib/assistance?tableId=${table.id}`);
    const data = await res.json().catch(() => null);
    if (res.ok) setAssistanceCall(data?.call ?? null);
  }
  useEffect(() => {
    if (!table) return;
    fetchAssistance();
    const t = setInterval(fetchAssistance, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id]);
  async function callWaiter() {
    if (!table || assistanceCall || assistanceBusy) return;
    setAssistanceBusy(true);
    const res = await fetch("/api/dzib/assistance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tableId: table.id }) });
    const data = await res.json().catch(() => null);
    setAssistanceBusy(false);
    if (!res.ok) { setMsg(data?.error ?? "No se pudo llamar al mesero"); return; }
    setAssistanceCall(data.call);
    setMsg("¡Listo! Tu mesero va en camino.");
  }
  const [payMethod, setPayMethod] = useState<"terminal" | "efectivo" | null>(null);
  const [cash, setCash] = useState("");
  const [payResult, setPayResult] = useState<{ changeCents: number } | null>(null);

  // ---- Datos de la cuenta (para el panel de Status y el total) ----
  async function fetchAccount(id: string) {
    if (!id) return;
    const res = await fetch(`/api/dzib/order?accountId=${id}`);
    const data = await res.json().catch(() => null);
    if (res.ok && data?.account) setAccount(data.account);
  }
  // Persistencia al cambiar de dispositivo: al abrir con el QR, cargar la
  // cuenta ABIERTA de la mesa (si la hay) para no empezar de cero. La
  // cuenta vive en Postgres, no en este navegador.
  useEffect(() => {
    if (!table) return;
    fetch(`/api/dzib/order?tableId=${table.id}`).then(async (r) => {
      const data = await r.json().catch(() => null);
      if (data?.account) { setAccountId(data.account.id); setAccount(data.account); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table?.id]);
  useEffect(() => {
    if (!accountId) return;
    fetchAccount(accountId);
    const t = setInterval(() => fetchAccount(accountId), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  const accItems: any[] = account?.items ?? [];
  const corridaOf = (i: any) => (i.corrida ?? 1) as number;
  // Corridas que ya viven en la cuenta (pedidas).
  const accountCorridaIds: number[] = [...new Set(accItems.filter((i) => i.tiempo).map(corridaOf))].sort((a, b) => a - b);
  // Borradores que todavía no se enviaron (sin contar el id 1 si la cuenta
  // ya trae una corrida 1).
  const visibleDrafts = drafts.filter((d) => !accountCorridaIds.includes(d.id));
  const allCorridaIds: number[] = [...new Set([...accountCorridaIds, ...visibleDrafts.map((d) => d.id)])].sort((a, b) => a - b);
  const isSent = (id: number) => accountCorridaIds.includes(id);
  // Mantener válida la corrida que se está armando.
  useEffect(() => {
    if (allCorridaIds.length > 0 && !allCorridaIds.includes(editingId)) setEditingId(allCorridaIds[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCorridaIds.join(",")]);

  // Selección de platillos de una corrida: del borrador si es nueva, o
  // reconstruida desde la cuenta si ya se pidió (por nombre de platillo).
  const selFor = (id: number): Sel => {
    const draft = visibleDrafts.find((d) => d.id === id);
    if (draft) return draft.sel;
    const sel = emptySel();
    for (const t of TIEMPOS) {
      const item = accItems.find((i) => i.tiempo === t && corridaOf(i) === id);
      if (!item) continue;
      const menuItem = MENU.items.find((m) => m.name === item.name);
      sel[t] = menuItem ?? { id: `acc-${item.name}`, name: item.name, soloPriceCents: item.priceCents };
    }
    return sel;
  };
  const setDraftSel = (id: number, t: Tiempo, value: any) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, sel: { ...d.sel, [t]: value } } : d)));
  };
  const requested = (t: Tiempo, id: number) => accItems.some((i) => i.tiempo === t && corridaOf(i) === id && i.status !== "espera");
  const served = (t: Tiempo, id: number) => accItems.some((i) => i.tiempo === t && corridaOf(i) === id && i.status === "entregado");
  const tiempoStatus = (t: Tiempo, id: number): string => {
    const items = accItems.filter((i) => i.tiempo === t && corridaOf(i) === id);
    if (items.length === 0) return selFor(id)[t] ? "Sin enviar" : "No elegido";
    if (items.every((i) => i.status === "entregado")) return "Entregado";
    if (items.some((i) => i.status === "listo")) return "Listo para recoger";
    if (items.some((i) => i.status === "preparando")) return "En preparación";
    if (items.some((i) => i.status === "pendiente")) return "En cocina";
    return "En espera";
  };
  const selectedTiempos = (id: number) => TIEMPOS.filter((t) => selFor(id)[t]);
  const nextToRequest = (id: number) => selectedTiempos(id).find((t) => !requested(t, id)) ?? null;
  const canRequest = (t: Tiempo, id: number) => {
    if (!selFor(id)[t] || requested(t, id) || !table) return false;
    const idx = TIEMPOS.indexOf(t);
    for (let i = 0; i < idx; i++) {
      if (selFor(id)[TIEMPOS[i]] && !served(TIEMPOS[i], id)) return false;
    }
    return true;
  };
  const blockedReason = (t: Tiempo, id: number) => {
    const idx = TIEMPOS.indexOf(t);
    for (let i = 0; i < idx; i++) {
      const prev = TIEMPOS[i];
      if (selFor(id)[prev] && !served(prev, id)) return `Se activa cuando te sirvan el ${TIEMPO_LABEL[prev]} de esta comida.`;
    }
    return "";
  };
  // Total de una corrida (misma regla que en el servidor): el precio lo
  // define el 3er tiempo elegido ($91 con guisado de $79, $78 con pollo a
  // la pibil o ensaladas, $140–$190 con un especial). Sin los 3 tiempos,
  // se suma cada uno por separado (1er $0, 2º $26, 3er su precio solo).
  const corridaTotal = (id: number) => {
    const sel = selFor(id);
    const chosen = TIEMPOS.filter((t) => sel[t]);
    if (chosen.length === 3) return menuPriceForThird(sel.tercero?.soloPriceCents ?? 0);
    return chosen.reduce((s, t) => s + (sel[t]?.soloPriceCents ?? 0), 0);
  };
  const accountTotal = account?.totalCents ?? 0;
  const extrasTotal = extras.reduce((s, e) => s + e.priceCents, 0);
  const draftTotals = visibleDrafts.reduce((s, d) => s + corridaTotal(d.id), 0);
  // Gran total: lo que ya está en la cuenta + las corridas en borrador +
  // lo por separado todavía sin enviar.
  const grandTotal = accountTotal + draftTotals + extrasTotal;
  const readyItems = accItems.filter((i) => i.status === "listo");
  const changeReady = Boolean(account?.changeReady) && account?.payment?.method === "efectivo";
  const sentExtras = accItems.filter((i) => !i.tiempo);
  // Desayunos y por separado, separados: lo pendiente (todavía en este
  // navegador) y lo ya enviado (en la cuenta). Un desayuno nunca se
  // etiqueta "por separado".
  const pendingBreakfast = extras.filter((e) => e.group === "desayuno");
  const pendingSeparate = extras.filter((e) => e.group !== "desayuno");
  const pendingBreakfastTotal = pendingBreakfast.reduce((s, e) => s + e.priceCents, 0);
  const pendingSeparateTotal = pendingSeparate.reduce((s, e) => s + e.priceCents, 0);
  const sentBreakfast = sentExtras.filter((i) => i.group === "desayuno");
  const sentSeparate = sentExtras.filter((i) => i.group !== "desayuno");

  // Pagar aparece cuando todo lo elegido ya se pidió: cada corrida con
  // platillos tiene sus tiempos pedidos y no quedan extras sin enviar.
  const corridasWithDishes = allCorridaIds.filter((id) => selectedTiempos(id).length > 0);
  const allCorridasRequested = corridasWithDishes.every((id) => selectedTiempos(id).every((t) => requested(t, id)));
  const showPay = Boolean(accountId) && account?.status === "abierta" && extras.length === 0 &&
    (corridasWithDishes.length > 0 ? allCorridasRequested : extrasSent);

  // ---- Acciones ----
  // group: "desayuno" = desayuno (sencillo, especial, guisado, otra
  // opción o extra de desayuno) y "separado" = pedido por separado de
  // comida (plato suelto, agua). El grupo viaja al servidor para que el
  // desayuno se etiquete "Desayunos" y no "por separado".
  function addExtra(name: string, priceCents: number, detail?: string, group: "desayuno" | "separado" = "separado") {
    setExtras((prev) => [...prev, { key: `x-${Date.now()}-${prev.length}`, name, priceCents, detail, group }]);
  }
  // Agregar un desayuno sencillo con su bebida y acompañamiento elegidos
  // (incluidos en el $82, sin costo extra).
  function addBreakfast(item: any) {
    const pick = breakfastPick;
    const detail = pick && pick.id === item.id ? `${pick.drink} · ${pick.side}` : "Café de olla · Jugo de naranja";
    addExtra(item.name, item.priceCents, detail, "desayuno");
    setBreakfastPick(null);
    setMsg(`${item.name} agregado (${detail}).`);
  }
  // Agregar el ingrediente extra: hay que escribir cuál es.
  function addIngredientExtra(item: any, group: "desayuno" | "separado" = "desayuno") {
    const text = extraIngredientText.trim();
    if (!text) { setMsg("Escribe qué ingrediente extra necesitas (ej. queso extra)."); return; }
    addExtra(item.name, item.priceCents, text, group);
    setExtraIngredientText("");
    setMsg(`Ingrediente extra agregado: ${text}.`);
  }
  async function sendOrder(items: { name: string; priceCents: number; tiempo?: string | null; corrida?: number | null; notes?: string | null; detail?: string | null; group?: "desayuno" | null }[]): Promise<string | null> {
    if (!table) { setMsg("Escanea el QR de tu mesa para pedir."); return null; }
    const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id, items }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? "No se pudo enviar el pedido"); return null; }
    setAccountId(data.accountId);
    return data.accountId as string;
  }
  async function pedirTiempo(corridaId: number, t: Tiempo) {
    const sel = selFor(corridaId);
    if (!sel[t]) { setMsg(`Primero elige tu ${TIEMPO_LABEL[t]}.`); return; }
    if (!canRequest(t, corridaId)) { setMsg(blockedReason(t, corridaId) || "Todavía no se puede pedir este tiempo."); return; }
    let id: string | null = accountId;
    const draft = visibleDrafts.find((d) => d.id === corridaId);
    if (draft) {
      // Primera vez que se pide algo de esta corrida: enviar sus platillos
      // elegidos (quedan en espera) y luego pedir este tiempo. Cada
      // platillo lleva su indicación especial, si el comensal escribió una.
      const items = TIEMPOS.filter((tt) => sel[tt]).map((tt) => ({ name: sel[tt].name, priceCents: sel[tt].soloPriceCents, tiempo: tt, corrida: corridaId, notes: tiempoNotes[`${corridaId}:${tt}`]?.trim() || null }));
      id = await sendOrder(items);
      if (!id) return;
      setDrafts((prev) => prev.filter((d) => d.id !== corridaId));
    }
    // La indicación especial viaja CON el pedido del tiempo: si el
    // comensal la escribió después de pedir el 1er tiempo, ya no está en
    // el borrador y solo vive en el navegador; si no se mandara aquí, se
    // perdería y cocina nunca la vería.
    const res = await fetch("/api/dzib/course", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: id, tiempo: t, corrida: corridaId, notes: tiempoNotes[`${corridaId}:${t}`]?.trim() || null }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? "No se pudo pedir el tiempo"); return; }
    setMsg(`¡${TIEMPO_LABEL[t]} de la Comida ${corridaId} pedido! Cocina y tu mesero ya fueron avisados.`);
    fetchAccount(id);
  }
  function addCorrida() {
    const nextId = Math.max(0, ...allCorridaIds, ...drafts.map((d) => d.id)) + 1;
    setDrafts((prev) => [...prev, { id: nextId, sel: emptySel() }]);
    setEditingId(nextId);
    setOpenSection("comida");
    setOpenTiempo("primero");
  }
  // Guardar la indicación especial de un tiempo que todavía está en
  // espera (aún no se pidió). Una vez pedido, queda fija.
  async function saveNotes(itemId: string, notes: string) {
    const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "notes", itemId, notes }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? "No se pudo guardar la indicación"); return; }
    setMsg("Indicación guardada — cocina la verá con tu tiempo.");
    fetchAccount(accountId);
  }
  async function sendExtras() {
    if (extras.length === 0) { setMsg("Agrega algo por separado primero."); return; }
    const items = extras.map((e) => ({ name: e.name, priceCents: e.priceCents, tiempo: null, corrida: null, notes: e.notes?.trim() || null, detail: e.detail || null, group: e.group === "desayuno" ? "desayuno" as const : null }));
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
  // Fila de un desayuno: los sencillos (categoría "desayuno") y el
  // guisado del día incluyen café de olla o té y jugo de naranja o
  // fruta; al tocar "Elegir" se abre el selector y se agregan con su
  // elección (sin costo extra). Especiales y otras opciones se agregan
  // directo, sin elección.
  const breakfastItemRow = (i: any) => {
    const pick = breakfastPick;
    return (
    <div key={i.id}>
      <div className="item"><div><b>{i.name}</b>{i.description && <div className="muted">{i.description}</div>}</div><span>{mxn(i.priceCents)} {table && (i.category === "desayuno" ? (
        <button type="button" onClick={() => setBreakfastPick(pick?.id === i.id ? null : { id: i.id, drink: "Café de olla", side: "Jugo de naranja" })}>Elegir</button>
      ) : (
        <button type="button" onClick={() => addExtra(i.name, i.priceCents, undefined, "desayuno")}>Agregar</button>
      ))}</span></div>
      {pick && pick.id === i.id && (
        <div style={{ border: "2px solid var(--gold)", borderRadius: 12, padding: 12, margin: "4px 0 10px" }}>
          <p style={{ margin: "0 0 6px" }}><b>¿Qué quieres con tu desayuno?</b> <span className="muted">(incluido en los {mxn(i.priceCents)})</span></p>
          <p style={{ margin: "6px 0" }}>Bebida:</p>
          <div className="pay-row">
            {DRINKS.map((d) => (
              <button key={d} type="button" className={pick.drink === d ? "active" : ""} onClick={() => setBreakfastPick({ ...pick, drink: d })}>{d}</button>
            ))}
          </div>
          <p style={{ margin: "6px 0" }}>Acompañamiento:</p>
          <div className="pay-row">
            {SIDES.map((s) => (
              <button key={s} type="button" className={pick.side === s ? "active" : ""} onClick={() => setBreakfastPick({ ...pick, side: s })}>{s}</button>
            ))}
          </div>
          <button type="button" className="big-btn" style={{ margin: "10px 0 0" }} onClick={() => addBreakfast(i)}>Agregar desayuno — {mxn(i.priceCents)}</button>
        </div>
      )}
    </div>
    );
  };
  // Fila del ingrediente extra: hay que escribir cuál se necesita.
  // group: "desayuno" cuando se agrega desde Desayunos, "separado"
  // cuando se agrega desde "Pedir por separado".
  const extraIngredientRow = (i: any, group: "desayuno" | "separado" = "desayuno") => (
    <div className="item" key={i.id}><div><b>{i.name}</b><div className="muted">Escribe qué ingrediente necesitas</div><input placeholder="Ej. queso extra" value={extraIngredientText} onChange={(e) => setExtraIngredientText(e.target.value)} style={{ marginTop: 6 }} /></div><span>{mxn(i.priceCents)} {table && <button type="button" onClick={() => addIngredientExtra(i, group)}>Agregar</button>}</span></div>
  );
  const editingSel = selFor(editingId);
  const editingSent = isSent(editingId);

  const pagarPanel = showPay ? (
    <div className="card" style={{ marginTop: 14 }}>
      <b>Pagar — Total de tu cuenta: {mxn(accountTotal)}</b>
      <p className="muted">Un solo pago por todo: tus comidas, tus desayunos y lo por separado.</p>
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
      {allCorridaIds.map((id) => (
        <div key={id}>
          <h3 style={{ marginTop: 12 }}>Comida {id}</h3>
          {TIEMPOS.map((t) => {
            const item = accItems.find((i) => i.tiempo === t && corridaOf(i) === id);
            const name = item?.name ?? selFor(id)[t]?.name;
            return (
              <div key={t}>
                <div className="item"><span>{TIEMPO_LABEL[t]}{name ? ` · ${name}` : ""}{item?.detail ? <span className="detail-line"> · {item.detail}</span> : ""}</span><span className={`status-pill ${item?.status ?? "espera"}`}>{tiempoStatus(t, id)}</span></div>
                {item?.notes && <p className="notes-line">⚠ Indicaciones: {item.notes}</p>}
              </div>
            );
          })}
        </div>
      ))}
      {sentExtras.map((i) => (
        <div key={i.id}>
          <div className="item"><span>{i.name} ({i.group === "desayuno" ? "Desayunos" : "por separado"}){i.detail ? <span className="detail-line"> · {i.detail}</span> : ""}</span><span className={`status-pill ${i.status}`}>{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</span></div>
          {i.notes && <p className="notes-line">⚠ Indicaciones: {i.notes}</p>}
        </div>
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
      {/* Barra superior fija: lo que estás pidiendo, visible siempre. */}
      {table && (
        <div className="dzib-topbar">
          <div className="dzib-topbar-inner">
            <span className="badge">{table.label}</span>
            <span className="topbar-summary">
              {allCorridaIds.length === 0 && extras.length === 0
                ? "Todavía no pides nada — elige abajo."
                : allCorridaIds.map((id) => {
                    const names = TIEMPOS.filter((t) => selFor(id)[t]).map((t) => selFor(id)[t].name);
                    return <span key={id} className="topbar-corrida">Comida {id}: {names.length > 0 ? names.join(" · ") : "sin elegir"} · {mxn(corridaTotal(id))}</span>;
                  })}
              {pendingBreakfast.length > 0 && <span className="topbar-corrida">Desayunos: {pendingBreakfast.length} · {mxn(pendingBreakfastTotal)}</span>}
              {pendingSeparate.length > 0 && <span className="topbar-corrida">Por separado: {pendingSeparate.length} · {mxn(pendingSeparateTotal)}</span>}
            </span>
            <b className="topbar-total">Total: {mxn(grandTotal)}</b>
          </div>
        </div>
      )}
      <main className="wrap">
        {!table ? (
          <p className="danger">Escanea el código QR de tu mesa para pedir. Sin QR solo puedes ver el menú.</p>
        ) : (
          <p><span className="badge">{table.label}</span> Estás pidiendo para {table.label}. Tu pedido se guarda en la mesa: si cambias de celular, ábrelo con el mismo QR y sigue donde ibas.</p>
        )}
        {readyItems.length > 0 && (
          <div className="alert gold">¡Tu platillo está listo para recoger! {readyItems.map((i) => i.name).join(", ")} — el mesero ya fue avisado.</div>
        )}
        {changeReady && (
          <div className="alert green">¡Cambio listo! El mesero va en camino con tu cambio.</div>
        )}

        {/* ---------- DESAYUNOS ---------- */}
        <Accordion title="Desayunos" sub="Hasta las 12:30 pm" open={openSection === "desayunos"} onToggle={() => setOpenSection(openSection === "desayunos" ? null : "desayunos")}>
          {/* El guisado del día ($78) también incluye café/té y jugo/fruta,
              igual que los sencillos: se agrega con el mismo selector. */}
          {breakfastItemRow({ id: "guisado", name: DZIB_SETTINGS.guisadoDelDia, description: "Guisado de hoy", priceCents: DZIB_SETTINGS.guisadoPriceCents, category: "desayuno" })}
          <p className="muted">Desayunos sencillos y guisado del día incluyen café de olla o té, y jugo de naranja o fruta (papaya con plátano).</p>
          {breakfastGroups.map((g) => (
            <SubAcc key={g.key} title={g.title} open={openBreakfast === g.key} onToggle={() => setOpenBreakfast(openBreakfast === g.key ? null : g.key)}>
              {g.items.map((i) => (i.name === "Ingrediente extra" ? extraIngredientRow(i) : breakfastItemRow(i)))}
            </SubAcc>
          ))}
          <p className="muted">Lo que agregues aquí se cobra por separado, a su precio individual.</p>
        </Accordion>

        {/* ---------- MENÚ DE COMIDA DEL DÍA ---------- */}
        <Accordion title="Menú de comida del día" sub="Menú sencillo de 3 tiempos · $91" open={openSection === "comida"} onToggle={() => setOpenSection(openSection === "comida" ? null : "comida")}>
          <p className="dzib-today"><b>Menú sencillo de 3 tiempos</b> (no incluye agua ni postre). Servicio de 1:30 pm a 7:00 pm. Todos nuestros precios incluyen IVA.</p>
          <p className="muted"><b>El precio lo define tu 3er tiempo:</b> menú de <b>$91</b> con los guisados (pescaditos, filete empanizado, sierra, ceviche…), menú de <b>$78</b> con pollo a la pibil y ensaladas, o el precio del especial que elijas ($140 a $190). El 1er y el 2º tiempo van <b>incluidos</b>. El 2º tiempo solo, fuera de la comida, cuesta $26.</p>
          {/* ¿Qué corrida estás armando? Cada una se pide a su ritmo. */}
          <div className="corrida-tabs">
            <span><b>Armar:</b></span>
            {allCorridaIds.map((id) => (
              <button key={id} type="button" className={editingId === id ? "active" : ""} onClick={() => { setEditingId(id); setOpenTiempo("primero"); }}>
                Comida {id}{isSent(id) ? " ✓" : ""}
              </button>
            ))}
            {table && <button type="button" onClick={addCorrida}>＋ Agregar otra comida</button>}
          </div>
          {editingSent && <p className="muted">La Comida {editingId} ya se pidió — sus platillos y su botón están abajo, en “Tu pedido”. Elige otra comida arriba para armarla.</p>}
          {TIEMPOS.map((t) => (
            <SubAcc key={t} title={`${TIEMPO_LABEL[t]}${t === "tercero" ? " · el precio define tu menú" : " · Incluido"}`} open={openTiempo === t} onToggle={() => setOpenTiempo(openTiempo === t ? null : t)}>
              {t === "primero" && <p className="muted">El 1er tiempo está incluido en el menú.</p>}
              {t === "segundo" && <p className="muted">El 2º tiempo está incluido en el menú. Solo, fuera de la comida, cuesta $26.</p>}
              {MENU.items.filter((i) => i.tiempo === t).map((i) => {
                const chosen = editingSel[t]?.id === i.id;
                if (t === "tercero") {
                  const menuPrice = menuPriceForThird(i.soloPriceCents);
                  return (
                    <div className={`pick${chosen ? " selected" : ""}`} key={i.id} onClick={() => table && !editingSent && setDraftSel(editingId, t, chosen ? null : i)} style={{ cursor: table && !editingSent ? "pointer" : "default" }}>
                      <div><span className="price-first">{mxn(menuPrice)}</span> <b>{i.name}</b>{chosen && <span className="sel-tag"> ✓ Elegido</span>}<div className="muted">Menú de {mxn(menuPrice)}{i.soloPriceCents !== menuPrice ? ` · Guisado solo ${mxn(i.soloPriceCents)}` : ""}</div></div>
                    </div>
                  );
                }
                return (
                  <div className={`pick${chosen ? " selected" : ""}`} key={i.id} onClick={() => table && !editingSent && setDraftSel(editingId, t, chosen ? null : i)} style={{ cursor: table && !editingSent ? "pointer" : "default" }}>
                    <div><b>{i.name}</b>{chosen && <span className="sel-tag"> ✓ Elegido</span>}</div>
                    <span><b>Incluido</b></span>
                  </div>
                );
              })}
              <p className="muted">Toca un platillo para elegirlo (uno por tiempo). Toca de nuevo para quitarlo.</p>
              {/* La indicación se puede escribir mientras el tiempo siga
                  en espera, aunque la comida ya se haya empezado a pedir:
                  antes el campo desaparecía al pedir el 1er tiempo y la
                  nota solo se podía poner en "Tu pedido". Al pedir el
                  tiempo, la nota viaja con el pedido a cocina. */}
              {table && !requested(t, editingId) && (
                <label style={{ display: "block", marginTop: 10 }}>Indicaciones especiales para el {TIEMPO_LABEL[t]} de la Comida {editingId} (opcional)
                  <input placeholder="Ej. sin cebolla y sin cilantro" value={tiempoNotes[`${editingId}:${t}`] ?? accItems.find((i) => i.tiempo === t && corridaOf(i) === editingId)?.notes ?? ""} onChange={(e) => setTiempoNotes((prev) => ({ ...prev, [`${editingId}:${t}`]: e.target.value }))} style={{ marginTop: 6 }} />
                </label>
              )}
              {requested(t, editingId) && (() => {
                const item = accItems.find((i) => i.tiempo === t && corridaOf(i) === editingId);
                return item?.notes ? <p className="notes-line">⚠ Indicaciones: {item.notes}</p> : null;
              })()}
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
        </Accordion>

        {/* ---------- PEDIR POR SEPARADO ---------- */}
        <Accordion title="Pedir por separado" sub="A la carta · precio individual" open={openSection === "separado"} onToggle={() => setOpenSection(openSection === "separado" ? null : "separado")}>
          <p className="muted">Cualquier platillo por su precio individual, fuera del menú sencillo. Se envía directo a cocina.</p>
          <SubAcc title="Desayunos" open={openBreakfast === "sep-des"} onToggle={() => setOpenBreakfast(openBreakfast === "sep-des" ? null : "sep-des")}>
            {DZIB_BREAKFAST.filter((i) => i.category !== "extra").map((i) => breakfastItemRow(i))}
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
            {extrasList.map((i) => (i.name === "Ingrediente extra" ? extraIngredientRow(i, "separado") : (
              <div className="item" key={i.id}><div><b>{i.name}</b></div><span>{mxn(i.priceCents)} {addBtn(i.name, i.priceCents)}</span></div>
            )))}
          </SubAcc>
        </Accordion>

        {/* ---------- TU PEDIDO (fuera de los submenús, hasta abajo) ---------- */}
        <div className="card" style={{ marginTop: 18 }}>
          <b>Tu pedido — {table?.label ?? "sin mesa"}</b>
          {allCorridaIds.length === 0 && <p className="muted">Todavía no armas ninguna comida. Elige tus tiempos arriba, en “Menú de comida del día”.</p>}
          {allCorridaIds.map((id) => {
            const sel = selFor(id);
            const chosen = TIEMPOS.filter((t) => sel[t]);
            const next = nextToRequest(id);
            return (
              <div key={id} style={{ borderTop: "2px dashed #bbb", paddingTop: 10, marginTop: 10 }}>
                <b>Comida {id}{isSent(id) ? " · Pedida ✓" : " · Armando"}</b>
                {chosen.length === 0 ? (
                  <p className="muted">Sin platillos todavía — elígelos arriba en “Menú de comida del día”.</p>
                ) : (
                  TIEMPOS.map((t) => sel[t] && (() => {
                    const item = accItems.find((i) => i.tiempo === t && corridaOf(i) === id);
                    return (
                      <div key={t}>
                        <div className="item"><span>{TIEMPO_LABEL[t]} · {sel[t].name}</span><span>{t === "tercero" ? mxn(menuPriceForThird(sel[t].soloPriceCents)) : "Incluido"} · {tiempoStatus(t, id)}</span></div>
                        {item?.notes && item.status !== "espera" && <p className="notes-line">⚠ Indicaciones: {item.notes}</p>}
                        {item && item.status === "espera" && (
                          <div style={{ margin: "4px 0 10px" }}>
                            <input placeholder="Indicaciones especiales (ej. sin cebolla y sin cilantro)" value={tiempoNotes[`${id}:${t}`] ?? item.notes ?? ""} onChange={(e) => setTiempoNotes((prev) => ({ ...prev, [`${id}:${t}`]: e.target.value }))} />
                            <button type="button" style={{ marginTop: 6 }} onClick={() => saveNotes(item.id, tiempoNotes[`${id}:${t}`] ?? item.notes ?? "")}>Guardar indicación</button>
                          </div>
                        )}
                      </div>
                    );
                  })())
                )}
                {chosen.length > 0 && (
                  <p><b>{chosen.length === 3 ? `Tu menú: ${mxn(corridaTotal(id))}` : `Total de esta comida: ${mxn(corridaTotal(id))}`}</b>{chosen.length === 3 ? ` · El precio lo definió tu 3er tiempo (${sel.tercero?.name})` : ""}</p>
                )}
                {table && next && (
                  <>
                    <button type="button" className="big-btn" disabled={!canRequest(next, id)} onClick={() => pedirTiempo(id, next)}>
                      {REQUEST_LABEL[next]}
                    </button>
                    {!canRequest(next, id) && <p className="muted">{blockedReason(next, id)}</p>}
                  </>
                )}
                {table && !next && chosen.length > 0 && (
                  <p><b>Tus tiempos de esta comida ya están pedidos ✓</b></p>
                )}
              </div>
            );
          })}
          {table && (
            <p><button type="button" onClick={addCorrida}>＋ Agregar otra comida</button></p>
          )}
          {!table && <p className="muted">Escanea el QR de tu mesa para pedir.</p>}
        </div>

        {/* Desayunos y por separado: lo que agregaste y el botón de enviar
            a cocina. Los desayunos van en su propio grupo ("Desayunos"),
            no mezclados con lo por separado. */}
        <div className="card" style={{ marginTop: 14 }}>
          <b>Desayunos y por separado</b>
          {sentBreakfast.length > 0 && (
            <>
              <p style={{ marginTop: 10 }}><b>Desayunos — enviados ✓</b></p>
              {sentBreakfast.map((i) => (
                <div key={i.id}>
                  <div className="item"><span>{i.name}{i.detail ? <span className="detail-line"> · {i.detail}</span> : ""}</span><span className={`status-pill ${i.status}`}>{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</span></div>
                  {i.notes && <p className="notes-line">⚠ Indicaciones: {i.notes}</p>}
                </div>
              ))}
            </>
          )}
          {sentSeparate.length > 0 && (
            <>
              <p style={{ marginTop: 10 }}><b>Por separado — enviados ✓</b></p>
              {sentSeparate.map((i) => (
                <div key={i.id}>
                  <div className="item"><span>{i.name}{i.detail ? <span className="detail-line"> · {i.detail}</span> : ""}</span><span className={`status-pill ${i.status}`}>{STATUS_LABEL[i.status as keyof typeof STATUS_LABEL] ?? i.status}</span></div>
                  {i.notes && <p className="notes-line">⚠ Indicaciones: {i.notes}</p>}
                </div>
              ))}
            </>
          )}
          {pendingBreakfast.length > 0 && (
            <>
              <p style={{ marginTop: 10 }}><b>Desayunos</b></p>
              {pendingBreakfast.map((e) => (
                <div key={e.key}>
                  <div className="item"><span>{e.name}{e.detail ? <span className="detail-line"> · {e.detail}</span> : ""}</span><span>{mxn(e.priceCents)} <button type="button" onClick={() => setExtras(extras.filter((x) => x.key !== e.key))}>Quitar</button></span></div>
                  <input placeholder="Indicaciones especiales (opcional)" value={e.notes ?? ""} onChange={(ev) => setExtras(extras.map((x) => (x.key === e.key ? { ...x, notes: ev.target.value } : x)))} style={{ margin: "4px 0 10px" }} />
                </div>
              ))}
            </>
          )}
          {pendingSeparate.length > 0 && (
            <>
              <p style={{ marginTop: 10 }}><b>Por separado</b></p>
              {pendingSeparate.map((e) => (
                <div key={e.key}>
                  <div className="item"><span>{e.name}{e.detail ? <span className="detail-line"> · {e.detail}</span> : ""}</span><span>{mxn(e.priceCents)} <button type="button" onClick={() => setExtras(extras.filter((x) => x.key !== e.key))}>Quitar</button></span></div>
                  <input placeholder="Indicaciones especiales (opcional)" value={e.notes ?? ""} onChange={(ev) => setExtras(extras.map((x) => (x.key === e.key ? { ...x, notes: ev.target.value } : x)))} style={{ margin: "4px 0 10px" }} />
                </div>
              ))}
            </>
          )}
          {extras.length === 0 && sentExtras.length === 0 && (
            <p className="muted">Todavía no agregaste desayunos ni nada por separado.</p>
          )}
          {extras.length > 0 && (
            <>
              <p><b>Total sin enviar: {mxn(extrasTotal)}</b>{pendingBreakfast.length > 0 && pendingSeparate.length > 0 ? ` (Desayunos ${mxn(pendingBreakfastTotal)} · Por separado ${mxn(pendingSeparateTotal)})` : ""}</p>
              <button type="button" className="big-btn" onClick={sendExtras}>Enviar pedido a cocina</button>
            </>
          )}
        </div>

        {pagarPanel}
        {statusPanel}

        {msg && <p>{msg}</p>}
        {payResult && account?.status === "cuenta-pedida" && (
          <div className="alert green">Cuenta pedida. {account?.payment?.method === "efectivo" ? `Tu cambio es ${mxn(payResult.changeCents)}.` : "El mesero trae la terminal."}</div>
        )}
        <p><a href="/dzib/personal">Personal</a></p>
      </main>
      {/* Botón circular fijo "Asistencia mesero": siempre visible con
          mesa (QR). Llama al mesero; mientras la llamada está pendiente
          muestra "Mesero en camino" y no se puede tocar dos veces. */}
      {table && (
        <button type="button" className="fab-waiter" disabled={Boolean(assistanceCall) || assistanceBusy} onClick={callWaiter}>
          {assistanceCall || assistanceBusy ? "Mesero en camino…" : "🔔 Asistencia mesero"}
        </button>
      )}
    </div>
  );
}
