// /dzib — vista del comensal. Acceso solo por QR de mesa (?mesa=N).
// SOLO DESAYUNOS por el momento (LUNCH_VISIBLE=false en lib/hours.ts,
// decisión del dueño 25 nov 2026): la comida está OCULTA, no eliminada.
// Submenús desplegables: Desayunos (todo el día, sin horario). El Menú
// de comida del día, la comida corrida y Pedir por separado vuelven
// solos al poner LUNCH_VISIBLE en true. El agua del día pedida dentro
// de una comida llega a cocina JUNTO con el primer tiempo de esa
// comida, con su contador (x1, x2…). La mesa puede pedir MÁS DE UNA
// comida corrida: cada corrida es un grupo independiente con su propio
// avance 1º → 2º → 3º (botones grandes por corrida), pero el total se
// paga junto en una sola cuenta. El panel "Tu pedido" vive FIJO en una
// columna lateral derecha (en celular se abre con un botón flotante
// "Tu pedido" como hoja superpuesta); ya no hay barra superior fija:
// la mesa y el total viven dentro del propio panel. El botón de pedir
// a cocina PARPADEA en cuanto hay algo en espera listo para pedirse.
// El pedido NO se pierde al cambiar de
// dispositivo: al abrir con el QR se carga la cuenta abierta de la mesa
// desde Postgres (única fuente de verdad). Diseño Dzib: banda rótulo
// oscura, piedra, naranja quemado / dorado.
"use client";
import { useEffect, useState } from "react";
import { DZIB_BREAKFAST, DZIB_DAILY_MENU_TODAY, DZIB_SETTINGS, DZIB_TABLES } from "@/data/dzib";
import { mxn, STATUS_LABEL, STATUS_LABEL_EN, menuPriceForThird } from "@/lib/types";
import { lunchOpen, mexicoHour, LUNCH_VISIBLE } from "@/lib/hours";

const MENU = DZIB_DAILY_MENU_TODAY;
const TIEMPOS = ["primero", "segundo", "tercero"] as const;
type Tiempo = (typeof TIEMPOS)[number];
// Bilingüe ES/EN de la vista del comensal (como /cocuyos): ES por
// defecto, la elección se guarda en localStorage y persiste al recargar
// o cambiar de dispositivo. Los nombres que se guardan en la cuenta y
// se mandan a la API siguen siendo los canónicos en español: solo
// cambia lo que VE el comensal (por id o por diccionario).
type Lang = "es" | "en";
const LANG_KEY = "dzib-lang";
const TIEMPO_LABEL_ES: Record<Tiempo, string> = { primero: "1er tiempo", segundo: "2º tiempo", tercero: "3er tiempo" };
const TIEMPO_LABEL_EN: Record<Tiempo, string> = { primero: "1st course", segundo: "2nd course", tercero: "3rd course" };
// Texto de los botones grandes del flujo (el primero dice "Empezar con
// primer tiempo", como pidió Cesar).
const REQUEST_LABEL_ES: Record<Tiempo, string> = { primero: "Empezar con primer tiempo", segundo: "Pedir segundo tiempo", tercero: "Pedir tercer tiempo" };
const REQUEST_LABEL_EN: Record<Tiempo, string> = { primero: "Start with the first course", segundo: "Order the second course", tercero: "Order the third course" };
// Bebida y acompañamiento incluidos: el valor que se guarda (detail) es
// el canónico en español; la etiqueta que ve el comensal se traduce.
const DRINK_EN: Record<string, string> = { "Café de olla": "Pot coffee", "Té": "Tea" };
const SIDE_EN: Record<string, string> = { "Jugo de naranja": "Orange juice", "Fruta (papaya con plátano)": "Fruit (papaya with banana)" };
const DETAIL_EN: Record<string, string> = { ...DRINK_EN, ...SIDE_EN };
const WATER_SIZE_EN: Record<string, string> = { vaso: "Glass", "jarra 1 l": "1 L pitcher", "jarra 2.5 l": "2.5 L pitcher" };
const T: Record<Lang, Record<string, string>> = {
  es: {
    headerSub: "Regina 54 · Centro Histórico · Cocina casera mexicana",
    personal: "Personal",
    scanQr: "Escanea el código QR de tu mesa para pedir. Sin QR solo puedes ver el menú.",
    orderingFor: "Estás pidiendo para {table}. Tu pedido se guarda en la mesa: si cambias de celular, ábrelo con el mismo QR y sigue donde ibas.",
    readyAlert: "¡Tu platillo está listo para recoger! {names} — el mesero ya fue avisado.",
    changeReady: "¡Cambio listo! El mesero va en camino con tu cambio.",
    breakfasts: "Desayunos",
    allDay: "Todo el día",
    breakfastsInclude: "Desayunos sencillos, especiales, otras opciones y guisado del día incluyen café de olla o té, y jugo de naranja o fruta (papaya con plátano).",
    groupSencillos: "Desayunos sencillos — $82",
    groupEspeciales: "Desayunos especiales — $92",
    groupOtras: "Otras opciones — $120 a $140",
    groupExtras: "Extras",
    choose: "Elegir",
    addAnother: "Agregar otro",
    add: "Agregar",
    whatWithBreakfast: "¿Qué quieres con tu desayuno?",
    includedIn: "(incluido en los {price})",
    drink: "Bebida:",
    side: "Acompañamiento:",
    chosen: " ✓ Elegido",
    addBreakfast: "Agregar desayuno — {price}",
    extraIngredientHint: "Escribe qué ingrediente necesitas",
    extraIngredientPh: "Ej. queso extra",
    payTitle: "Pagar — Total de tu cuenta: {total}",
    cardTerminal: "💳 Tarjeta (terminal)",
    cash: "💵 Efectivo",
    whichBill: "¿Con qué billete vas a pagar?",
    billPh: "Ej. 200",
    exactAmount: "Cantidad exacta ({total})",
    yourChange: "Tu cambio: {change} — Caja prepara el cambio y avisa a tu mesero para que te lo lleve.",
    notCover: "Esa cantidad no cubre el total de {total}.",
    confirmPay: "Confirmar pago",
    cashNotCover: "El efectivo no cubre el total. Revisa con qué billete vas a pagar.",
    payFail: "No se pudo pedir la cuenta",
    checkOrderedCash: "Cuenta pedida. Tu cambio es {change}; el mesero lo trae en cuanto caja lo tenga listo.",
    checkOrderedCard: "Cuenta pedida. El mesero trae la terminal a tu mesa.",
    checkOrderedCashShort: "Cuenta pedida. Tu cambio es {change}.",
    checkOrderedCardShort: "El mesero trae la terminal.",
    scanQrOrder: "Escanea el QR de tu mesa para pedir.",
    sendFail: "No se pudo enviar el pedido",
    courseFail: "No se pudo pedir el tiempo",
    chooseFirst: "Primero elige tu {tiempo}.",
    lunchFrom1: "La comida corrida se sirve a partir de la 1:00 pm.",
    cannotYet: "Todavía no se puede pedir este tiempo.",
    activatesWhen: "Se activa cuando te sirvan el {tiempo} de esta comida.",
    courseOrdered: "¡{tiempo} de la Comida {id} pedido! Cocina y tu mesero ya fueron avisados.",
    notesFail: "No se pudo guardar la indicación",
    notesSaved: "Indicación guardada — cocina la verá con tu tiempo.",
    addSeparateFirst: "Agrega algo por separado primero.",
    sendFailShort: "No se pudo enviar",
    extraIngredientNeed: "Escribe qué ingrediente extra necesitas (ej. queso extra).",
    extraIngredientAdded: "Ingrediente extra agregado: {text}.",
    waiterFail: "No se pudo llamar al mesero",
    waiterOk: "¡Listo! Tu mesero va en camino.",
    yourOrder: "Tu pedido",
    total: "Total: {total}",
    yourOrderTable: "Tu pedido — {table}",
    noTable: "sin mesa",
    noMealYet: "Todavía no armas ninguna comida. Elige tus tiempos arriba, en “Menú de comida del día”.",
    meal: "Comida {id}",
    mealOrdered: "Comida {id} · Pedida ✓",
    mealBuilding: "Comida {id} · Armando",
    noDishesYet: "Sin platillos todavía — elígelos arriba en “Menú de comida del día”.",
    yourMenu: "Tu menú: {total}",
    mealTotal: "Total de esta comida: {total}",
    priceByThird: "El precio lo definió tu 3er tiempo ({name})",
    allCoursesOrdered: "Tus tiempos de esta comida ya están pedidos ✓",
    addAnotherMeal: "＋ Agregar otra comida",
    mealAlreadyOrdered: "La Comida {id} ya se pidió — sus platillos y su botón están abajo, en “Tu pedido”. Elige otra comida arriba para armarla.",
    build: "Armar:",
    lunchTitle: "Menú de comida del día",
    lunchSubOpen: "Menú sencillo de 3 tiempos · $91",
    lunchSubClosed: "La comida corrida se sirve a partir de la 1:00 pm",
    lunchIntro: "Menú sencillo de 3 tiempos (no incluye agua ni postre). Servicio de 1:30 pm a 7:00 pm. Todos nuestros precios incluyen IVA.",
    lunchPriceRule: "El precio lo define tu 3er tiempo: menú de $91 con los guisados (pescaditos, filete empanizado, sierra, ceviche…), menú de $78 con pollo a la pibil y ensaladas, o el precio del especial que elijas ($140 a $190). El 1er y el 2º tiempo van incluidos. El 2º tiempo solo, fuera de la comida, cuesta $26.",
    firstIncluded: "El 1er tiempo está incluido en el menú.",
    secondIncluded: "El 2º tiempo está incluido en el menú. Solo, fuera de la comida, cuesta $26.",
    thirdSetsPrice: "el precio define tu menú",
    included: "Incluido",
    setMenuPrice: "Menú de {price}",
    stewAlone: "Guisado solo {price}",
    tapToChoose: "Toca un platillo para elegirlo (uno por tiempo). Toca de nuevo para quitarlo.",
    specialNotesFor: "Indicaciones especiales para el {tiempo} de la Comida {id} (opcional)",
    notesPh: "Ej. sin cebolla y sin cilantro",
    notesLine: "⚠ Indicaciones: {notes}",
    saveNote: "Guardar indicación",
    waterTitle: "Agua del día — con tu comida",
    priceToConfirm: "Precio por confirmar",
    waterNote: "Precios por confirmar con el restaurante (valores iniciales, no confirmados). El agua va con el primer tiempo de la Comida {id}.",
    waterWithFirst: "Agua del día · Con el primer tiempo de la Comida {id}",
    waterAdded: "Agua agregada a la Comida {id} — va directo a cocina.",
    separateTitle: "Pedir por separado",
    separateSub: "A la carta · precio individual",
    separateIntro: "Cualquier platillo por su precio individual, fuera del menú sencillo. Se envía directo a cocina.",
    separateFood: "Comida suelta — por tiempo",
    separateWater: "Agua del día y extras",
    inSetMenu: "En menú sencillo",
    waterAndPrice: "Agua del día · Precio por confirmar",
    breakfastsAndSeparate: "Desayunos y por separado",
    breakfastsSent: "Desayunos — enviados ✓",
    separateSent: "Por separado — enviados ✓",
    separatePending: "Por separado",
    remove: "Quitar",
    notesPhShort: "Indicaciones especiales (opcional)",
    notesPhLong: "Indicaciones especiales (ej. sin cebolla y sin cilantro)",
    noneYetBoth: "Todavía no agregaste desayunos ni nada por separado.",
    noneYetBreakfast: "Todavía no agregaste desayunos.",
    totalUnsent: "Total sin enviar: {total}",
    totalUnsentSplit: " (Desayunos {b} · Por separado {s})",
    sendToKitchen: "Enviar pedido a cocina",
    fabOrder: "🧾 Tu pedido",
    fabConfirm: "❗ Confirma tu pedido",
    waiterBtn: "🔔 Mesero",
    waiterComing: "En camino",
    notSent: "Sin enviar",
    notChosen: "No elegido",
    goesWithFirst: "Va con el primer tiempo",
    table: "Mesa {id}",
  },
  en: {
    headerSub: "Regina 54 · Historic Center · Mexican home cooking",
    personal: "Staff",
    scanQr: "Scan your table's QR code to order. Without a QR you can only view the menu.",
    orderingFor: "You're ordering for {table}. Your order is saved to the table: if you switch phones, open it with the same QR and pick up where you left off.",
    readyAlert: "Your dish is ready to pick up! {names} — your waiter has been notified.",
    changeReady: "Change ready! Your waiter is on the way with your change.",
    breakfasts: "Breakfast",
    allDay: "All day",
    breakfastsInclude: "Plain and special breakfasts, other options and the stew of the day include pot coffee or tea, and orange juice or fruit (papaya with banana).",
    groupSencillos: "Plain breakfasts — $82",
    groupEspeciales: "Special breakfasts — $92",
    groupOtras: "Other options — $120 to $140",
    groupExtras: "Extras",
    choose: "Choose",
    addAnother: "Add another",
    add: "Add",
    whatWithBreakfast: "What would you like with your breakfast?",
    includedIn: "(included in the {price})",
    drink: "Drink:",
    side: "Side:",
    chosen: " ✓ Chosen",
    addBreakfast: "Add breakfast — {price}",
    extraIngredientHint: "Write which ingredient you need",
    extraIngredientPh: "E.g. extra cheese",
    payTitle: "Pay — Your check total: {total}",
    cardTerminal: "💳 Card (terminal)",
    cash: "💵 Cash",
    whichBill: "What bill will you pay with?",
    billPh: "E.g. 200",
    exactAmount: "Exact amount ({total})",
    yourChange: "Your change: {change} — The cashier is preparing your change and will let your waiter know to bring it to you.",
    notCover: "That amount doesn't cover the total of {total}.",
    confirmPay: "Confirm payment",
    cashNotCover: "The cash doesn't cover the total. Check which bill you'll pay with.",
    payFail: "Couldn't request the check",
    checkOrderedCash: "Check requested. Your change is {change}; your waiter will bring it as soon as the cashier has it ready.",
    checkOrderedCard: "Check requested. Your waiter is bringing the terminal to your table.",
    checkOrderedCashShort: "Check requested. Your change is {change}.",
    checkOrderedCardShort: "Your waiter is bringing the terminal.",
    scanQrOrder: "Scan your table's QR code to order.",
    sendFail: "Couldn't send the order",
    courseFail: "Couldn't order the course",
    chooseFirst: "Choose your {tiempo} first.",
    lunchFrom1: "The set lunch is served from 1:00 pm.",
    cannotYet: "You can't order this course yet.",
    activatesWhen: "It becomes available once you're served the {tiempo} of this meal.",
    courseOrdered: "{tiempo} of Meal {id} ordered! The kitchen and your waiter have been notified.",
    notesFail: "Couldn't save the note",
    notesSaved: "Note saved — the kitchen will see it with your course.",
    addSeparateFirst: "Add something à la carte first.",
    sendFailShort: "Couldn't send it",
    extraIngredientNeed: "Write which extra ingredient you need (e.g. extra cheese).",
    extraIngredientAdded: "Extra ingredient added: {text}.",
    waiterFail: "Couldn't call the waiter",
    waiterOk: "Done! Your waiter is on the way.",
    yourOrder: "Your order",
    total: "Total: {total}",
    yourOrderTable: "Your order — {table}",
    noTable: "no table",
    noMealYet: "You haven't built a meal yet. Choose your courses above, in “Today's lunch menu”.",
    meal: "Meal {id}",
    mealOrdered: "Meal {id} · Ordered ✓",
    mealBuilding: "Meal {id} · Building",
    noDishesYet: "No dishes yet — choose them above in “Today's lunch menu”.",
    yourMenu: "Your set menu: {total}",
    mealTotal: "Total for this meal: {total}",
    priceByThird: "Your 3rd course set the price ({name})",
    allCoursesOrdered: "All courses of this meal are already ordered ✓",
    addAnotherMeal: "＋ Add another meal",
    mealAlreadyOrdered: "Meal {id} is already ordered — its dishes and button are below, in “Your order”. Choose another meal above to build it.",
    build: "Build:",
    lunchTitle: "Today's lunch menu",
    lunchSubOpen: "3-course set menu · $91",
    lunchSubClosed: "The set lunch is served from 1:00 pm",
    lunchIntro: "3-course set menu (water and dessert not included). Served 1:30 pm to 7:00 pm. All prices include tax (IVA).",
    lunchPriceRule: "Your 3rd course sets the price: $91 menu with the stews (fish bites, breaded fish fillet, sierra, ceviche…), $78 menu with pollo a la pibil and salads, or the price of the special you choose ($140 to $190). The 1st and 2nd courses are included. The 2nd course on its own, outside the set menu, costs $26.",
    firstIncluded: "The 1st course is included in the set menu.",
    secondIncluded: "The 2nd course is included in the set menu. On its own, outside the meal, it costs $26.",
    thirdSetsPrice: "sets your menu price",
    included: "Included",
    setMenuPrice: "Set menu {price}",
    stewAlone: "Stew on its own {price}",
    tapToChoose: "Tap a dish to choose it (one per course). Tap again to remove it.",
    specialNotesFor: "Special instructions for the {tiempo} of Meal {id} (optional)",
    notesPh: "E.g. no onion and no cilantro",
    notesLine: "⚠ Instructions: {notes}",
    saveNote: "Save note",
    waterTitle: "Water of the day — with your meal",
    priceToConfirm: "Price to be confirmed",
    waterNote: "Prices to be confirmed with the restaurant (initial values, unconfirmed). The water comes with the first course of Meal {id}.",
    waterWithFirst: "Water of the day · With the first course of Meal {id}",
    waterAdded: "Water added to Meal {id} — it goes straight to the kitchen.",
    separateTitle: "Order à la carte",
    separateSub: "À la carte · individual price",
    separateIntro: "Any dish at its individual price, outside the set menu. It goes straight to the kitchen.",
    separateFood: "Lunch dishes — by course",
    separateWater: "Water of the day and extras",
    inSetMenu: "In the set menu",
    waterAndPrice: "Water of the day · Price to be confirmed",
    breakfastsAndSeparate: "Breakfasts and à la carte",
    breakfastsSent: "Breakfasts — sent ✓",
    separateSent: "À la carte — sent ✓",
    separatePending: "À la carte",
    remove: "Remove",
    notesPhShort: "Special instructions (optional)",
    notesPhLong: "Special instructions (e.g. no onion, no cilantro)",
    noneYetBoth: "You haven't added any breakfasts or à la carte items yet.",
    noneYetBreakfast: "You haven't added any breakfasts yet.",
    totalUnsent: "Total not yet sent: {total}",
    totalUnsentSplit: " (Breakfasts {b} · À la carte {s})",
    sendToKitchen: "Send order to kitchen",
    fabOrder: "🧾 Your order",
    fabConfirm: "❗ Confirm your order",
    waiterBtn: "🔔 Waiter",
    waiterComing: "On the way",
    notSent: "Not sent",
    notChosen: "Not chosen",
    goesWithFirst: "Goes with the first course",
    table: "Table {id}",
  },
};
const WATER = [
  { name: "Agua del día — vaso", priceCents: DZIB_SETTINGS.waterGlassPriceCents, label: "Vaso" },
  { name: "Agua del día — jarra 1 L", priceCents: DZIB_SETTINGS.waterJar1PriceCents, label: "Jarra 1 L" },
  { name: "Agua del día — jarra 2.5 L", priceCents: DZIB_SETTINGS.waterJar25PriceCents, label: "Jarra 2.5 L" },
];

type Extra = { key: string; name: string; priceCents: number; detail?: string; notes?: string; group?: "desayuno" | "separado"; qty?: number };
type WaterPick = { name: string; priceCents: number; qty: number };
type Sel = Record<Tiempo, any>;
const emptySel = (): Sel => ({ primero: null, segundo: null, tercero: null });
// Bebida y acompañamiento incluidos en los desayunos (sencillos,
// especiales, otras opciones y guisado del día), sin costo extra.
const DRINKS = ["Café de olla", "Té"] as const;
const SIDES = ["Jugo de naranja", "Fruta (papaya con plátano)"] as const;

function Accordion({ title, sub, open, onToggle, disabled, children }: { title: string; sub?: string; open: boolean; onToggle: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <div className={`accordion${disabled ? " disabled" : ""}`}>
      <button className="accordion-head" onClick={() => { if (!disabled) onToggle(); }} type="button" disabled={disabled} aria-disabled={disabled}>
        <span>{title}{sub ? <div style={{ fontSize: 13, letterSpacing: ".08em", color: "#c9a227" }}>{sub}</div> : null}</span>
        <span className="chev">{disabled ? "🔒" : open ? "▾" : "▸"}</span>
      </button>
      {open && !disabled && <div className="accordion-body">{children}</div>}
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
  // Horarios de servicio (hora de Ciudad de México): desayunos todo
  // el día (sin horario) y comida corrida a partir de la 1:00 pm. Se
  // recalcula cada minuto para que la pantalla cambie sola al llegar
  // la 1:00 pm.
  const [, setTimeTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTimeTick((n) => n + 1), 60000); return () => clearInterval(t); }, []);
  const lOpen = lunchOpen();
  // SOLO DESAYUNOS por el momento (LUNCH_VISIBLE=false): la comida está
  // oculta del comensal, no eliminada. Todo lo de comida en esta vista
  // (acordeón, corridas, por separado, agua) se renderiza solo si la
  // bandera está prendida; las cuentas de comida ya abiertas se siguen
  // viendo en el Status y se pagan con normalidad.
  const lunchVisible = LUNCH_VISIBLE;
  // Idioma del comensal (como /cocuyos): ES por defecto, guardado en
  // localStorage y persistente al recargar o cambiar de dispositivo.
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "es";
    try { return (localStorage.getItem(LANG_KEY) as Lang) === "en" ? "en" : "es"; } catch { return "es"; }
  });
  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* ignorar */ }
  }, [lang]);
  // "tr" y no "t": en el JSX hay variables de tiempo llamadas `t`
  // (TIEMPOS.map((t) => ...)) que taparían un helper llamado `t`.
  const tr = (k: string, vars?: Record<string, string | number>) => {
    let s = T[lang][k] ?? T.es[k] ?? k;
    if (vars) for (const [kk, vv] of Object.entries(vars)) s = s.replaceAll(`{${kk}}`, String(vv));
    return s;
  };
  const tiempoLabel = (tt: Tiempo) => (lang === "en" ? TIEMPO_LABEL_EN[tt] : TIEMPO_LABEL_ES[tt]);
  const requestLabel = (tt: Tiempo) => (lang === "en" ? REQUEST_LABEL_EN[tt] : REQUEST_LABEL_ES[tt]);
  const statusLabel = (s: string) => (lang === "en" ? STATUS_LABEL_EN[s as keyof typeof STATUS_LABEL_EN] ?? s : STATUS_LABEL[s as keyof typeof STATUS_LABEL] ?? s);
  // Nombre de un platillo como lo VE el comensal. El nombre que se
  // guarda en la cuenta y se manda a la API es siempre el canónico en
  // español (item.name): cocina/meseros/caja no cambian nada.
  const displayName = (name: string) => {
    if (lang === "es") return name;
    if (name === DZIB_SETTINGS.guisadoDelDia) return DZIB_SETTINGS.guisadoDelDiaEn;
    return DZIB_BREAKFAST.find((b) => b.name === name)?.nameEn ?? name;
  };
  const displayDesc = (item: any) => (lang === "en" ? (item.descriptionEn ?? item.description) : item.description);
  const drinkLabel = (d: string) => (lang === "en" ? DRINK_EN[d] ?? d : d);
  const sideLabel = (s: string) => (lang === "en" ? SIDE_EN[s] ?? s : s);
  // El `detail` guardado es canónico en español ("Café de olla ·
  // Jugo de naranja"); al mostrarlo se traduce parte por parte.
  const translateDetail = (d?: string | null) => {
    if (!d || lang === "es") return d ?? "";
    return d.split(" · ").map((p) => DETAIL_EN[p] ?? p).join(" · ");
  };
  const displayTableLabel = (tb: { id: number; label: string }) => (lang === "en" ? tr("table", { id: tb.id }) : tb.label);
  const waterSize = (label: string) => (lang === "en" ? WATER_SIZE_EN[label.toLowerCase()] ?? label : label);
  const waterDisplay = (name: string) => {
    if (lang === "es") return name;
    const size = name.replace("Agua del día — ", "");
    return `Water of the day · ${WATER_SIZE_EN[size.toLowerCase()] ?? size}`;
  };
  const [openSection, setOpenSection] = useState<"desayunos" | "comida" | "separado" | null>(() => {
    if (!LUNCH_VISIBLE) return "desayunos";
    return mexicoHour() < 13 ? "desayunos" : "comida";
  });
  const [openTiempo, setOpenTiempo] = useState<Tiempo | null>("primero");
  const [openBreakfast, setOpenBreakfast] = useState<string | null>(null);
  // Corridas en borrador (todavía no enviadas a cocina). Cada una tiene su
  // propia selección por tiempo y su agua del día: el agua pedida dentro
  // de una comida llega a cocina JUNTO con el primer tiempo que se pida
  // de esa comida (no por separado). Cuando se pide su 1er tiempo, sus
  // platillos se envían a la cuenta y el borrador desaparece (la corrida
  // ya vive en la cuenta, que es la fuente de verdad).
  const [drafts, setDrafts] = useState<{ id: number; sel: Sel; water: WaterPick[] }[]>([{ id: 1, sel: emptySel(), water: [] }]);
  // Corrida que está armando el comensal en el acordeón de comida.
  const [editingId, setEditingId] = useState(1);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [extrasSent, setExtrasSent] = useState(false);
  // Panel "Tu pedido" en celular: hoja superpuesta que se abre con el
  // botón flotante. En pantallas anchas el panel siempre está visible
  // a la derecha y este estado no hace nada.
  const [pedidoOpen, setPedidoOpen] = useState(false);
  // Elección de bebida/acompañamiento de un desayuno: qué platillo
  // tiene el selector abierto y qué lleva elegido (por defecto, café
  // de olla + jugo de naranja). Sencillos, especiales, otras opciones
  // y el guisado del día incluyen esto.
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
    if (!res.ok) { setMsg(data?.error ?? tr("waiterFail")); return; }
    setAssistanceCall(data.call);
    setMsg(tr("waiterOk"));
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
  // El agua (kind "agua") NO es un tiempo: nunca se reconstruye como
  // platillo de un tiempo, aunque viaje con el primer tiempo.
  const selFor = (id: number): Sel => {
    const draft = visibleDrafts.find((d) => d.id === id);
    if (draft) return draft.sel;
    const sel = emptySel();
    for (const t of TIEMPOS) {
      const item = accItems.find((i) => i.tiempo === t && i.kind !== "agua" && corridaOf(i) === id);
      if (!item) continue;
      const menuItem = MENU.items.find((m) => m.name === item.name);
      sel[t] = menuItem ?? { id: `acc-${item.name}`, name: item.name, soloPriceCents: item.priceCents };
    }
    return sel;
  };
  const setDraftSel = (id: number, t: Tiempo, value: any) => {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, sel: { ...d.sel, [t]: value } } : d)));
  };
  const requested = (t: Tiempo, id: number) => accItems.some((i) => i.tiempo === t && i.kind !== "agua" && corridaOf(i) === id && i.status !== "espera");
  const served = (t: Tiempo, id: number) => accItems.some((i) => i.tiempo === t && i.kind !== "agua" && corridaOf(i) === id && i.status === "entregado");
  const tiempoStatus = (t: Tiempo, id: number): string => {
    const items = accItems.filter((i) => i.tiempo === t && i.kind !== "agua" && corridaOf(i) === id);
    if (items.length === 0) return selFor(id)[t] ? tr("notSent") : tr("notChosen");
    if (items.every((i) => i.status === "entregado")) return statusLabel("entregado");
    if (items.some((i) => i.status === "listo")) return statusLabel("listo");
    if (items.some((i) => i.status === "preparando")) return statusLabel("preparando");
    if (items.some((i) => i.status === "pendiente")) return statusLabel("pendiente");
    return statusLabel("espera");
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
      if (selFor(id)[prev] && !served(prev, id)) return tr("activatesWhen", { tiempo: tiempoLabel(prev) });
    }
    return "";
  };
  // Total de una corrida (misma regla que en el servidor): el precio lo
  // define el 3er tiempo elegido ($91 con guisado de $79, $78 con pollo a
  // la pibil o ensaladas, $140–$190 con un especial). Sin los 3 tiempos,
  // se suma cada uno por separado (1er $0, 2º $26, 3er su precio solo).
  // El agua de la comida se suma aparte por unidad: el menú no la incluye.
  const draftWaterTotal = (id: number) => {
    const draft = visibleDrafts.find((d) => d.id === id);
    return (draft?.water ?? []).reduce((s, w) => s + w.priceCents * w.qty, 0);
  };
  const corridaTotal = (id: number) => {
    const sel = selFor(id);
    const chosen = TIEMPOS.filter((t) => sel[t]);
    const base = chosen.length === 3
      ? menuPriceForThird(sel.tercero?.soloPriceCents ?? 0)
      : chosen.reduce((s, t) => s + (sel[t]?.soloPriceCents ?? 0), 0);
    return base + draftWaterTotal(id);
  };
  const accountTotal = account?.totalCents ?? 0;
  const extrasTotal = extras.reduce((s, e) => s + e.priceCents * (e.qty ?? 1), 0);
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
  const pendingBreakfastTotal = pendingBreakfast.reduce((s, e) => s + e.priceCents * (e.qty ?? 1), 0);
  const pendingSeparateTotal = pendingSeparate.reduce((s, e) => s + e.priceCents * (e.qty ?? 1), 0);
  const sentBreakfast = sentExtras.filter((i) => i.group === "desayuno");
  // El agua de una comida (kind "agua" con corrida) se muestra bajo su
  // comida en el Status, no aquí en "por separado".
  const sentSeparate = sentExtras.filter((i) => i.group !== "desayuno" && !(i.kind === "agua" && i.corrida));
  // Cantidad de un platillo ya en el pedido (para pintarlo de color y
  // mostrar su contador ×N): lo pendiente en este navegador (extras sin
  // enviar) + lo que ya vive en la cuenta (Postgres, fuente de verdad:
  // sobrevive recargar la página o cambiar de dispositivo). Cuenta por
  // nombre, sumando qty. Solo ítems sin tiempo (desayunos y por
  // separado) y no cancelados. Si se quita un platillo del pedido, su
  // color y su contador se actualizan solos.
  const addedCount = (name: string) => {
    const pending = extras.filter((e) => e.name === name).reduce((s, e) => s + (e.qty ?? 1), 0);
    const sent = sentExtras.filter((i) => i.name === name && i.status !== "cancelado").reduce((s, i) => s + (i.qty ?? 1), 0);
    return pending + sent;
  };

  // Pagar aparece cuando todo lo elegido ya se pidió: cada corrida con
  // platillos tiene sus tiempos pedidos y no quedan extras sin enviar.
  // OJO: lo "por separado" ya enviado se lee de la CUENTA (sentExtras),
  // no solo del estado local extrasSent: al volver a abrir con el QR,
  // recargar la página o cambiar de dispositivo, extrasSent se pierde
  // (empieza en false) y el comensal nunca veía el botón de Pagar — la
  // cuenta nunca llegaba a "cuenta-pedida" y Caja no podía confirmar el
  // pago. La cuenta (Postgres) es la fuente de verdad, no el navegador.
  const corridasWithDishes = allCorridaIds.filter((id) => selectedTiempos(id).length > 0);
  const allCorridasRequested = corridasWithDishes.every((id) => selectedTiempos(id).every((t) => requested(t, id)));
  // Con la comida oculta (LUNCH_VISIBLE=false), una cuenta de comida ya
  // abierta se puede pagar tal como está: el comensal ya no puede pedir
  // los tiempos que le faltan, así que no se le exige completarlos para
  // pagar el total que Caja ve. Con la comida visible, se exige lo de
  // siempre (todos los tiempos pedidos).
  // El total y el método de pago (Pagar) solo se despliegan cuando
  // TODO lo pedido ya se entregó: ningún ítem en espera, pendiente,
  // preparando ni listo. Si el comensal pide algo más después, se
  // vuelve a ocultar hasta que lo nuevo también se entregue.
  const allDelivered = accItems.length > 0 && accItems.every((i) => i.status === "entregado" || i.status === "cancelado");
  const showPay = Boolean(accountId) && account?.status === "abierta" && extras.length === 0 && allDelivered &&
    (corridasWithDishes.length > 0 ? (lunchVisible ? allCorridasRequested : true) : (extrasSent || sentExtras.length > 0));

  // Botón flotante de celular "Tu pedido": cambia de estado cuando el
  // cliente agrega cosas a su pedido. Si hay algo elegido pero aún no
  // enviado a cocina (desayunos/extras en `extras`, o un tiempo elegido
  // sin pedir cuando la comida está visible), el botón dice "Confirma
  // tu pedido", en rojo y parpadeando. Al enviarlo, vuelve a su estado
  // normal "Tu pedido". Solo cambia el botón flotante; el panel lateral
  // de escritorio no se toca.
  const hasPendingToConfirm = extras.length > 0 ||
    corridasWithDishes.some((id) => selectedTiempos(id).some((t) => !requested(t, id)));

  // ---- Acciones ----
  // group: "desayuno" = desayuno (sencillo, especial, guisado, otra
  // opción o extra de desayuno) y "separado" = pedido por separado de
  // comida (plato suelto, agua). El grupo viaja al servidor para que el
  // desayuno se etiquete "Desayunos" y no "por separado".
  function addExtra(name: string, priceCents: number, detail?: string, group: "desayuno" | "separado" = "separado", qty: number = 1) {
    setExtras((prev) => [...prev, { key: `x-${Date.now()}-${prev.length}`, name, priceCents, detail, group, qty }]);
  }
  // Agua por separado: cada vez que se presiona el botón se suma una
  // más a la misma fila (x1, x2…) en vez de agregar otra fila igual.
  function addWaterSeparate(w: { name: string; priceCents: number }) {
    setExtras((prev) => {
      const found = prev.find((e) => e.name === w.name && e.group === "separado");
      if (found) return prev.map((e) => (e === found ? { ...e, qty: (e.qty ?? 1) + 1 } : e));
      return [...prev, { key: `x-${Date.now()}-${prev.length}`, name: w.name, priceCents: w.priceCents, group: "separado" as const, qty: 1 }];
    });
  }
  function removeWaterSeparate(name: string) {
    setExtras((prev) => {
      const found = prev.find((e) => e.name === name && e.group === "separado");
      if (!found) return prev;
      if ((found.qty ?? 1) <= 1) return prev.filter((e) => e !== found);
      return prev.map((e) => (e === found ? { ...e, qty: (e.qty ?? 1) - 1 } : e));
    });
  }
  // Agua dentro de una comida: se suma al borrador de la comida que se
  // está armando (editingId) y llega a cocina JUNTO con el primer tiempo
  // que se pida de esa comida. Si la comida ya se pidió, el agua va
  // directo a cocina como parte de esa comida (su primer tiempo ya salió).
  function addWaterToComida(w: { name: string; priceCents: number }) {
    if (!lOpen) { setMsg(tr("lunchFrom1")); return; }
    if (!table) return;
    if (isSent(editingId)) {
      void sendOrder([{ name: w.name, priceCents: w.priceCents, tiempo: null, corrida: editingId, kind: "agua", qty: 1 }]).then((id) => {
        if (id) { setMsg(tr("waterAdded", { id: editingId })); fetchAccount(id); }
      });
      return;
    }
    setDrafts((prev) => prev.map((d) => {
      if (d.id !== editingId) return d;
      const found = d.water.find((x) => x.name === w.name);
      const water = found
        ? d.water.map((x) => (x === found ? { ...x, qty: x.qty + 1 } : x))
        : [...d.water, { name: w.name, priceCents: w.priceCents, qty: 1 }];
      return { ...d, water };
    }));
  }
  function removeWaterFromComida(name: string) {
    setDrafts((prev) => prev.map((d) => {
      if (d.id !== editingId) return d;
      const found = d.water.find((x) => x.name === name);
      if (!found) return d;
      const water = found.qty <= 1 ? d.water.filter((x) => x !== found) : d.water.map((x) => (x === found ? { ...x, qty: x.qty - 1 } : x));
      return { ...d, water };
    }));
  }
  // Agregar un desayuno con su bebida y acompañamiento elegidos
  // (incluidos en el precio, sin costo extra). La confirmación no se
  // muestra como línea de texto: el platillo ya aparece en "Tu pedido"
  // con su elección, y cocina/meseros/caja la ven en el detalle.
  function addBreakfast(item: any) {
    const pick = breakfastPick;
    const detail = pick && pick.id === item.id ? `${pick.drink} · ${pick.side}` : "Café de olla · Jugo de naranja";
    addExtra(item.name, item.priceCents, detail, "desayuno");
    setBreakfastPick(null);
  }
  // Agregar el ingrediente extra: hay que escribir cuál es.
  function addIngredientExtra(item: any, group: "desayuno" | "separado" = "desayuno") {
    const text = extraIngredientText.trim();
    if (!text) { setMsg(tr("extraIngredientNeed")); return; }
    addExtra(item.name, item.priceCents, text, group);
    setExtraIngredientText("");
    setMsg(tr("extraIngredientAdded", { text }));
  }
  async function sendOrder(items: { name: string; priceCents: number; tiempo?: string | null; corrida?: number | null; notes?: string | null; detail?: string | null; group?: "desayuno" | null; qty?: number; kind?: "agua" | null }[]): Promise<string | null> {
    if (!table) { setMsg(tr("scanQrOrder")); return null; }
    const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableId: table.id, items }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? tr("sendFail")); return null; }
    setAccountId(data.accountId);
    return data.accountId as string;
  }
  async function pedirTiempo(corridaId: number, t: Tiempo) {
    const sel = selFor(corridaId);
    if (!sel[t]) { setMsg(tr("chooseFirst", { tiempo: tiempoLabel(t) })); return; }
    if (!lOpen) { setMsg(tr("lunchFrom1")); return; }
    if (!canRequest(t, corridaId)) { setMsg(blockedReason(t, corridaId) || tr("cannotYet")); return; }
    let id: string | null = accountId;
    const draft = visibleDrafts.find((d) => d.id === corridaId);
    if (draft) {
      // Primera vez que se pide algo de esta corrida: enviar sus platillos
      // elegidos (quedan en espera) y luego pedir este tiempo. Cada
      // platillo lleva su indicación especial, si el comensal escribió una.
      // El agua de la comida viaja en el mismo envío, con este mismo
      // tiempo: llega a cocina junto con él, no por separado.
      const items = [
        ...TIEMPOS.filter((tt) => sel[tt]).map((tt) => ({ name: sel[tt].name, priceCents: sel[tt].soloPriceCents, tiempo: tt, corrida: corridaId, notes: tiempoNotes[`${corridaId}:${tt}`]?.trim() || null })),
        ...draft.water.map((w) => ({ name: w.name, priceCents: w.priceCents, tiempo: t, corrida: corridaId, kind: "agua" as const, qty: w.qty })),
      ];
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
    if (!res.ok) { setMsg(data?.error ?? tr("courseFail")); return; }
    setMsg(tr("courseOrdered", { tiempo: tiempoLabel(t), id: corridaId }));
    fetchAccount(id);
  }
  function addCorrida() {
    if (!lOpen) { setMsg(tr("lunchFrom1")); return; }
    const nextId = Math.max(0, ...allCorridaIds, ...drafts.map((d) => d.id)) + 1;
    setDrafts((prev) => [...prev, { id: nextId, sel: emptySel(), water: [] }]);
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
    if (!res.ok) { setMsg(data?.error ?? tr("notesFail")); return; }
    setMsg(tr("notesSaved"));
    fetchAccount(accountId);
  }
  async function sendExtras() {
    if (extras.length === 0) { setMsg(tr("addSeparateFirst")); return; }
    const items = extras.map((e) => ({ name: e.name, priceCents: e.priceCents, tiempo: null, corrida: null, notes: e.notes?.trim() || null, detail: e.detail || null, group: e.group === "desayuno" ? "desayuno" as const : null, qty: e.qty ?? 1 }));
    const id = accountId ? accountId : await sendOrder(items);
    if (!id) return;
    if (accountId) {
      const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: table!.id, items }) });
      if (!res.ok) { const d = await res.json().catch(() => null); setMsg(d?.error ?? tr("sendFailShort")); return; }
    }
    setExtras([]); setExtrasSent(true);
    fetchAccount(id);
  }
  async function pagar() {
    if (!accountId || !payMethod) return;
    const cashCents = payMethod === "efectivo" ? Math.round(Number(cash || "0") * 100) : undefined;
    if (payMethod === "efectivo" && (!cashCents || cashCents < accountTotal)) { setMsg(tr("cashNotCover")); return; }
    const res = await fetch("/api/dzib/order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pay", accountId, method: payMethod, cashCents }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { setMsg(data?.error ?? tr("payFail")); return; }
    setPayResult({ changeCents: data.changeCents ?? 0 });
    setMsg(payMethod === "efectivo"
      ? tr("checkOrderedCash", { change: mxn(data.changeCents ?? 0) })
      : tr("checkOrderedCard"));
    fetchAccount(accountId);
  }

  const sencillos = DZIB_BREAKFAST.filter((i) => i.category === "desayuno");
  const especiales = DZIB_BREAKFAST.filter((i) => i.category === "especial");
  const otras = DZIB_BREAKFAST.filter((i) => i.category === "otra");
  const extrasList = DZIB_BREAKFAST.filter((i) => i.category === "extra");
  const breakfastGroups = [
    { key: "sencillos", title: tr("groupSencillos"), items: sencillos },
    { key: "especiales", title: tr("groupEspeciales"), items: especiales },
    { key: "otras", title: tr("groupOtras"), items: otras },
    { key: "extras", title: tr("groupExtras"), items: extrasList },
  ];
  const addBtn = (name: string, priceCents: number) => table ? (
    <button type="button" onClick={() => addExtra(name, priceCents)}>Agregar</button>
  ) : null;
  // Fila de un desayuno: sencillos, especiales, otras opciones y el
  // guisado del día incluyen café de olla o té y jugo de naranja o
  // fruta; al tocar "Elegir" se abre el selector y se agregan con su
  // elección (sin costo extra). Si el platillo ya está en el pedido, la
  // fila cambia de color y muestra su contador ×N (addedCount, leído de
  // la cuenta); al volver a pulsar se agrega otra unidad y el contador
  // sube. El botón pasa a "Agregar otro" con el color de elegido.
  const breakfastItemRow = (i: any) => {
    const pick = breakfastPick;
    const count = addedCount(i.name);
    const isBreakfast = i.category === "desayuno" || i.category === "especial" || i.category === "otra";
    return (
    <div key={i.id}>
      <div className={count > 0 ? "item agregado" : "item"}><div><b>{displayName(i.name)}</b>{count > 0 && <span className="qty-badge">×{count}</span>}{displayDesc(i) && <div className="muted">{displayDesc(i)}</div>}</div><span className="item-action"><span className="item-price">{mxn(i.priceCents)}</span>{table && (isBreakfast ? (
        <button type="button" className={count > 0 ? "picked" : ""} onClick={() => setBreakfastPick(pick?.id === i.id ? null : { id: i.id, drink: "Café de olla", side: "Jugo de naranja" })}>{count > 0 ? tr("addAnother") : tr("choose")}</button>
      ) : (
        <button type="button" className={count > 0 ? "picked" : ""} onClick={() => addExtra(i.name, i.priceCents, undefined, "desayuno")}>{count > 0 ? tr("addAnother") : tr("add")}</button>
      ))}</span></div>
      {pick && pick.id === i.id && (
        <div style={{ border: "2px solid var(--gold)", borderRadius: 12, padding: 12, margin: "4px 0 10px" }}>
          <p style={{ margin: "0 0 6px" }}><b>{tr("whatWithBreakfast")}</b> <span className="muted">{tr("includedIn", { price: mxn(i.priceCents) })}</span></p>
          <p style={{ margin: "6px 0" }}>{tr("drink")}</p>
          <div className="pay-row">
            {DRINKS.map((d) => (
              <button key={d} type="button" className={pick.drink === d ? "picked" : ""} onClick={() => setBreakfastPick({ ...pick, drink: d })}>{drinkLabel(d)}{pick.drink === d ? tr("chosen") : ""}</button>
            ))}
          </div>
          <p style={{ margin: "6px 0" }}>{tr("side")}</p>
          <div className="pay-row">
            {SIDES.map((s) => (
              <button key={s} type="button" className={pick.side === s ? "picked" : ""} onClick={() => setBreakfastPick({ ...pick, side: s })}>{sideLabel(s)}{pick.side === s ? tr("chosen") : ""}</button>
            ))}
          </div>
          <button type="button" className="big-btn" style={{ margin: "10px 0 0" }} onClick={() => addBreakfast(i)}>{tr("addBreakfast", { price: mxn(i.priceCents) })}</button>
        </div>
      )}
    </div>
    );
  };
  // Fila del ingrediente extra: hay que escribir cuál se necesita.
  // group: "desayuno" cuando se agrega desde Desayunos, "separado"
  // cuando se agrega desde "Pedir por separado". Igual que los demás
  // desayunos: si ya se agregó, la fila cambia de color y muestra ×N.
  const extraIngredientRow = (i: any, group: "desayuno" | "separado" = "desayuno") => {
    const count = addedCount(i.name);
    return (
    <div className={count > 0 ? "item agregado" : "item"} key={i.id}><div><b>{displayName(i.name)}</b>{count > 0 && <span className="qty-badge">×{count}</span>}<div className="muted">{tr("extraIngredientHint")}</div><input placeholder={tr("extraIngredientPh")} value={extraIngredientText} onChange={(e) => setExtraIngredientText(e.target.value)} style={{ marginTop: 6 }} /></div><span className="item-action"><span className="item-price">{mxn(i.priceCents)}</span>{table && <button type="button" className={count > 0 ? "picked" : ""} onClick={() => addIngredientExtra(i, group)}>{count > 0 ? tr("addAnother") : tr("add")}</button>}</span></div>
    );
  };
  const editingSel = selFor(editingId);
  const editingSent = isSent(editingId);

  const pagarPanel = showPay ? (
    <div className="card" style={{ marginTop: 14 }}>
      <b>{tr("payTitle", { total: mxn(accountTotal) })}</b>
      <div className="pay-row pay-row-pago">
        <button type="button" className={payMethod === "terminal" ? "active" : ""} onClick={() => setPayMethod("terminal")}>{tr("cardTerminal")}</button>
        <button type="button" className={payMethod === "efectivo" ? "active" : ""} onClick={() => setPayMethod("efectivo")}>{tr("cash")}</button>
      </div>
      {payMethod === "efectivo" && (
        <>
          <label>{tr("whichBill")}
            <input inputMode="numeric" placeholder={tr("billPh")} value={cash} onChange={(e) => setCash(e.target.value)} />
          </label>
          <div className="cash-quick">
            {[100, 200, 500].map((b) => (
              <button key={b} type="button" onClick={() => setCash(String(b))}>${b}</button>
            ))}
            <button type="button" onClick={() => setCash(String(Math.ceil(accountTotal / 100)))}>{tr("exactAmount", { total: mxn(accountTotal) })}</button>
          </div>
          {cash && Number(cash) * 100 >= accountTotal && (
            <p><b>{tr("yourChange", { change: mxn(Number(cash) * 100 - accountTotal) })}</b></p>
          )}
          {cash && Number(cash) * 100 < accountTotal && <p className="danger">{tr("notCover", { total: mxn(accountTotal) })}</p>}
        </>
      )}
      {payMethod && (
        <button type="button" className="big-btn green" onClick={pagar}>{tr("confirmPay")}</button>
      )}
    </div>
  ) : null;


  return (
    <div className="dzib">
      <header className="dzib-header">
        <div className="dzib-header-inner">
          <div className="dzib-brand">DZIB</div>
          <div className="dzib-sub">{tr("headerSub")}</div>
          <div className="dzib-lang-toggle lang-toggle" role="group" aria-label="Idioma / Language">
            <button type="button" className={lang === "es" ? "active" : ""} onClick={() => setLang("es")}>ES</button>
            <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
          </div>
          <a className="dzib-personal" href="/dzib/personal">{tr("personal")}</a>
        </div>
      </header>
      <main className="wrap dzib-layout">
        <div className="dzib-menu-col">
        {!table ? (
          <p className="danger">{tr("scanQr")}</p>
        ) : (
          <p><span className="badge">{displayTableLabel(table)}</span> {tr("orderingFor", { table: displayTableLabel(table) })}</p>
        )}
        {readyItems.length > 0 && (
          <div className="alert gold">{tr("readyAlert", { names: readyItems.map((i) => displayName(i.name)).join(", ") })}</div>
        )}
        {changeReady && (
          <div className="alert green">{tr("changeReady")}</div>
        )}

        {/* ---------- DESAYUNOS ---------- */}
        <Accordion title={tr("breakfasts")} sub={tr("allDay")} open={openSection === "desayunos"} onToggle={() => setOpenSection(openSection === "desayunos" ? null : "desayunos")}>
          {/* El guisado del día ($78) también incluye café/té y jugo/fruta,
              igual que los sencillos: se agrega con el mismo selector. */}
          {breakfastItemRow({ id: "guisado", name: DZIB_SETTINGS.guisadoDelDia, nameEn: DZIB_SETTINGS.guisadoDelDiaEn, description: "", descriptionEn: "", priceCents: DZIB_SETTINGS.guisadoPriceCents, category: "desayuno" })}
          <p className="muted">{tr("breakfastsInclude")}</p>
          {breakfastGroups.map((g) => (
            <SubAcc key={g.key} title={g.title} open={openBreakfast === g.key} onToggle={() => setOpenBreakfast(openBreakfast === g.key ? null : g.key)}>
              {g.items.map((i) => (i.name === "Ingrediente extra" ? extraIngredientRow(i) : breakfastItemRow(i)))}
            </SubAcc>
          ))}
        </Accordion>

        {/* ---------- MENÚ DE COMIDA DEL DÍA ---------- */}
        {/* Oculto por LUNCH_VISIBLE=false (solo desayunos por el momento).
            No se borra nada: vuelve solo al prender la bandera. */}
        {lunchVisible && (
        <Accordion title={tr("lunchTitle")} sub={lOpen ? tr("lunchSubOpen") : tr("lunchSubClosed")} open={openSection === "comida"} onToggle={() => setOpenSection(openSection === "comida" ? null : "comida")} disabled={!lOpen}>
          <p className="dzib-today">{tr("lunchIntro")}</p>
          <p className="muted">{tr("lunchPriceRule")}</p>
          {/* ¿Qué corrida estás armando? Cada una se pide a su ritmo. */}
          <div className="corrida-tabs">
            <span><b>{tr("build")}</b></span>
            {allCorridaIds.map((id) => (
              <button key={id} type="button" className={editingId === id ? "active" : ""} onClick={() => { setEditingId(id); setOpenTiempo("primero"); }}>
                {tr("meal", { id })}{isSent(id) ? " ✓" : ""}
              </button>
            ))}
            {table && <button type="button" onClick={addCorrida}>{tr("addAnotherMeal")}</button>}
          </div>
          {editingSent && <p className="muted">{tr("mealAlreadyOrdered", { id: editingId })}</p>}
          {TIEMPOS.map((t) => (
            <SubAcc key={t} title={`${tiempoLabel(t)}${t === "tercero" ? " · " + tr("thirdSetsPrice") : " · " + tr("included")}`} open={openTiempo === t} onToggle={() => setOpenTiempo(openTiempo === t ? null : t)}>
              {t === "primero" && <p className="muted">{tr("firstIncluded")}</p>}
              {t === "segundo" && <p className="muted">{tr("secondIncluded")}</p>}
              {MENU.items.filter((i) => i.tiempo === t).map((i) => {
                const chosen = editingSel[t]?.id === i.id;
                if (t === "tercero") {
                  const menuPrice = menuPriceForThird(i.soloPriceCents);
                  return (
                    <div className={`pick${chosen ? " selected" : ""}`} key={i.id} onClick={() => table && !editingSent && setDraftSel(editingId, t, chosen ? null : i)} style={{ cursor: table && !editingSent ? "pointer" : "default" }}>
                      <div><span className="price-first">{mxn(menuPrice)}</span> <b>{i.name}</b>{chosen && <span className="sel-tag">{tr("chosen")}</span>}<div className="muted">{tr("setMenuPrice", { price: mxn(menuPrice) })}{i.soloPriceCents !== menuPrice ? ` · ${tr("stewAlone", { price: mxn(i.soloPriceCents) })}` : ""}</div></div>
                    </div>
                  );
                }
                return (
                  <div className={`pick${chosen ? " selected" : ""}`} key={i.id} onClick={() => table && !editingSent && setDraftSel(editingId, t, chosen ? null : i)} style={{ cursor: table && !editingSent ? "pointer" : "default" }}>
                    <div><b>{i.name}</b>{chosen && <span className="sel-tag">{tr("chosen")}</span>}</div>
                    <span><b>{tr("included")}</b></span>
                  </div>
                );
              })}
              <p className="muted">{tr("tapToChoose")}</p>
              {/* La indicación se puede escribir mientras el tiempo siga
                  en espera, aunque la comida ya se haya empezado a pedir:
                  antes el campo desaparecía al pedir el 1er tiempo y la
                  nota solo se podía poner en "Tu pedido". Al pedir el
                  tiempo, la nota viaja con el pedido a cocina. */}
              {table && !requested(t, editingId) && (
                <label style={{ display: "block", marginTop: 10 }}>{tr("specialNotesFor", { tiempo: tiempoLabel(t), id: editingId })}
                  <input placeholder={tr("notesPh")} value={tiempoNotes[`${editingId}:${t}`] ?? accItems.find((i) => i.tiempo === t && i.kind !== "agua" && corridaOf(i) === editingId)?.notes ?? ""} onChange={(e) => setTiempoNotes((prev) => ({ ...prev, [`${editingId}:${t}`]: e.target.value }))} style={{ marginTop: 6 }} />
                </label>
              )}
              {requested(t, editingId) && (() => {
                const item = accItems.find((i) => i.tiempo === t && i.kind !== "agua" && corridaOf(i) === editingId);
                return item?.notes ? <p className="notes-line">{tr("notesLine", { notes: item.notes })}</p> : null;
              })()}
            </SubAcc>
          ))}

          {/* Agua del día, dentro del menú de comida: se suma a la comida
              que se está armando y llega a cocina JUNTO con el primer
              tiempo de esa comida (no por separado). Cada toque suma una
              más (x1, x2…) y el botón queda marcado de color. */}
          <div className="sub-acc">
            <div className="sub-acc-head"><span>{tr("waterTitle")}</span><span>{tr("priceToConfirm")}</span></div>
            <div className="sub-acc-body">
              <p className="muted">{tr("waterNote", { id: editingId })}</p>
              {WATER.map((w) => {
                const draftQty = (visibleDrafts.find((d) => d.id === editingId)?.water ?? []).find((x) => x.name === w.name)?.qty ?? 0;
                const sentQty = accItems.filter((i) => i.kind === "agua" && i.name === w.name && corridaOf(i) === editingId).reduce((s, i) => s + (i.qty ?? 1), 0);
                const qty = draftQty + sentQty;
                return (
                  <div className="item" key={w.name}><div><b>{waterSize(w.label)}{qty > 0 ? ` ×${qty}` : ""}</b><div className="muted">{tr("waterWithFirst", { id: editingId })}</div></div><span className="item-action"><span className="item-price">{mxn(w.priceCents)}</span><span className="item-note">Precio por confirmar</span><span className="item-btns">
                    <button type="button" className={qty > 0 ? "picked" : ""} onClick={() => table && addWaterToComida(w)}>＋ {tr("add")}{qty > 0 ? ` ×${qty}` : ""}</button>
                    {draftQty > 0 && <button type="button" onClick={() => removeWaterFromComida(w.name)} title="Quitar una">−</button>}
                  </span></span></div>
                );
              })}
            </div>
          </div>
        </Accordion>
        )}

        {/* ---------- PEDIR POR SEPARADO ---------- */}
        {/* Oculto por LUNCH_VISIBLE=false: su contenido de comida (platos
            sueltos y agua) no se ofrece por el momento. Los desayunos ya
            tienen su propio acordeón arriba; nada se borra. */}
        {lunchVisible && (
        <Accordion title={tr("separateTitle")} sub={tr("separateSub")} open={openSection === "separado"} onToggle={() => setOpenSection(openSection === "separado" ? null : "separado")}>
          <p className="muted">{tr("separateIntro")}</p>
          <SubAcc title={tr("breakfasts")} open={openBreakfast === "sep-des"} onToggle={() => setOpenBreakfast(openBreakfast === "sep-des" ? null : "sep-des")}>
            {DZIB_BREAKFAST.filter((i) => i.category !== "extra").map((i) => breakfastItemRow(i))}
          </SubAcc>
          <SubAcc title={tr("separateFood")} open={openBreakfast === "sep-comida"} onToggle={() => setOpenBreakfast(openBreakfast === "sep-comida" ? null : "sep-comida")}>
            {MENU.items.map((i) => (
              <div className="item" key={i.id}><div><b>{i.name}</b><div className="muted">{tiempoLabel(i.tiempo as Tiempo)}</div></div><span className="item-action"><span className="item-price">{i.soloPriceCents === 0 ? tr("inSetMenu") : mxn(i.soloPriceCents)}</span>{i.soloPriceCents > 0 ? addBtn(i.name, i.soloPriceCents) : null}</span></div>
            ))}
          </SubAcc>
          <SubAcc title={tr("separateWater")} open={openBreakfast === "sep-agua"} onToggle={() => setOpenBreakfast(openBreakfast === "sep-agua" ? null : "sep-agua")}>
            {WATER.map((w) => {
              const qty = extras.filter((e) => e.name === w.name && e.group === "separado").reduce((s, e) => s + (e.qty ?? 1), 0);
              return (
                <div className="item" key={w.name}><div><b>{waterSize(w.label)}{qty > 0 ? ` ×${qty}` : ""}</b><div className="muted">{tr("waterAndPrice")}</div></div><span className="item-action"><span className="item-price">{mxn(w.priceCents)}</span><span className="item-btns">
                  <button type="button" className={qty > 0 ? "picked" : ""} onClick={() => table && addWaterSeparate(w)}>＋ {tr("add")}{qty > 0 ? ` ×${qty}` : ""}</button>
                  {qty > 0 && <button type="button" onClick={() => removeWaterSeparate(w.name)} title="Quitar una">−</button>}
                </span></span></div>
              );
            })}
            {extrasList.map((i) => (i.name === "Ingrediente extra" ? extraIngredientRow(i, "separado") : (
              <div className="item" key={i.id}><div><b>{i.name.startsWith("Agua del día") ? waterDisplay(i.name) : displayName(i.name)}</b></div><span className="item-action"><span className="item-price">{mxn(i.priceCents)}</span>{addBtn(i.name, i.priceCents)}</span></div>
            )))}
          </SubAcc>
        </Accordion>
        )}

        {msg && <p>{msg}</p>}
        {payResult && account?.status === "cuenta-pedida" && (
          <div className="alert green">{account?.payment?.method === "efectivo" ? tr("checkOrderedCashShort", { change: mxn(payResult.changeCents) }) : tr("checkOrderedCardShort")}</div>
        )}
        </div>
        <aside className={`dzib-pedido-aside${pedidoOpen ? " abierto" : ""}`}>
          <div className="pedido-aside-head">
            <b>{tr("yourOrder")}</b>
            {table && <span className="badge">{displayTableLabel(table)}</span>}
            <span className="pedido-aside-total">{tr("total", { total: mxn(grandTotal) })}</span>
            <button type="button" className="pedido-close" onClick={() => setPedidoOpen(false)} aria-label="Cerrar pedido">✕</button>
          </div>
        {/* ---------- TU PEDIDO (columna lateral derecha) ---------- */}
        {/* La tarjeta de comidas solo se muestra si la comida está
            visible o si la mesa ya tiene una comida en su cuenta abierta
            (para que esa cuenta se siga viendo y pagando). */}
        {(lunchVisible || accountCorridaIds.length > 0) && (
        <div className="card" style={{ marginTop: 18 }}>
          <b>{tr("yourOrderTable", { table: table ? displayTableLabel(table) : tr("noTable") })}</b>
          {allCorridaIds.length === 0 && <p className="muted">{tr("noMealYet")}</p>}
          {allCorridaIds.map((id) => {
            const sel = selFor(id);
            const chosen = TIEMPOS.filter((t) => sel[t]);
            const next = nextToRequest(id);
            // Agua de esta comida: la del borrador (aún no enviada) y la
            // ya enviada (en la cuenta), con su cantidad (x1, x2…).
            const draftWater = (visibleDrafts.find((d) => d.id === id)?.water ?? []);
            const sentWater = accItems.filter((i) => i.kind === "agua" && corridaOf(i) === id);
            return (
              <div key={id} style={{ borderTop: "2px dashed #bbb", paddingTop: 10, marginTop: 10 }}>
                <b>{isSent(id) ? tr("mealOrdered", { id }) : tr("mealBuilding", { id })}</b>
                {chosen.length === 0 && draftWater.length === 0 && sentWater.length === 0 ? (
                  <p className="muted">{tr("noDishesYet")}</p>
                ) : (
                  TIEMPOS.map((t) => sel[t] && (() => {
                    const item = accItems.find((i) => i.tiempo === t && i.kind !== "agua" && corridaOf(i) === id);
                    return (
                      <div key={t}>
                        <div className="item"><span>{tiempoLabel(t)} · {sel[t].name}</span><span>{t === "tercero" ? mxn(menuPriceForThird(sel[t].soloPriceCents)) : tr("included")} · {tiempoStatus(t, id)}</span></div>
                        {item?.notes && item.status !== "espera" && <p className="notes-line">{tr("notesLine", { notes: item.notes })}</p>}
                        {item && item.status === "espera" && (
                          <div style={{ margin: "4px 0 10px" }}>
                            <input placeholder={tr("notesPhLong")} value={tiempoNotes[`${id}:${t}`] ?? item.notes ?? ""} onChange={(e) => setTiempoNotes((prev) => ({ ...prev, [`${id}:${t}`]: e.target.value }))} />
                            <button type="button" style={{ marginTop: 6 }} onClick={() => saveNotes(item.id, tiempoNotes[`${id}:${t}`] ?? item.notes ?? "")}>{tr("saveNote")}</button>
                          </div>
                        )}
                      </div>
                    );
                  })())
                )}
                {draftWater.map((w) => (
                  <div className="item" key={`dw-${w.name}`}><span>{waterDisplay(w.name)}{w.qty > 1 ? ` ×${w.qty}` : ""}</span><span>{mxn(w.priceCents * w.qty)} · {tr("goesWithFirst")}</span></div>
                ))}
                {sentWater.map((i) => (
                  <div className="item" key={i.id}><span>{waterDisplay(i.name)}{i.qty > 1 ? ` ×${i.qty}` : ""}</span><span>{mxn(i.priceCents * i.qty)} · {statusLabel(i.status)}</span></div>
                ))}
                {chosen.length > 0 && (
                  <p><b>{chosen.length === 3 ? tr("yourMenu", { total: mxn(corridaTotal(id)) }) : tr("mealTotal", { total: mxn(corridaTotal(id)) })}</b>{chosen.length === 3 ? ` · ${tr("priceByThird", { name: sel.tercero?.name })}` : ""}</p>
                )}
                {table && next && lunchVisible && (
                  <>
                    <button type="button" className={lOpen && canRequest(next, id) ? "big-btn parpadea-pedir" : "big-btn"} disabled={!lOpen || !canRequest(next, id)} onClick={() => pedirTiempo(id, next)}>
                      {requestLabel(next)}
                    </button>
                    {!lOpen ? <p className="muted">{tr("lunchFrom1")}</p>
                      : !canRequest(next, id) && <p className="muted">{blockedReason(next, id)}</p>}
                  </>
                )}
                {table && !next && chosen.length > 0 && (
                  <p><b>{tr("allCoursesOrdered")}</b></p>
                )}
              </div>
            );
          })}
          {table && lunchVisible && lOpen && (
            <p><button type="button" onClick={addCorrida}>{tr("addAnotherMeal")}</button></p>
          )}
          {!table && <p className="muted">{tr("scanQrOrder")}</p>}
        </div>
        )}

        {/* Desayunos y por separado: lo que agregaste y el botón de enviar
            a cocina. Los desayunos van en su propio grupo ("Desayunos"),
            no mezclados con lo por separado. */}
        <div className="card" style={{ marginTop: 14 }}>
          <b>{lunchVisible ? tr("breakfastsAndSeparate") : tr("breakfasts")}</b>
          {sentBreakfast.length > 0 && (
            <>
              <p style={{ marginTop: 10 }}><b>{tr("breakfastsSent")}</b></p>
              {sentBreakfast.map((i) => (
                <div key={i.id}>
                  <div className="item"><span>{displayName(i.name)}{i.detail ? <span className="detail-line"> · {translateDetail(i.detail)}</span> : ""}</span><span className={`status-pill ${i.status}`}>{statusLabel(i.status)}</span></div>
                  {i.notes && <p className="notes-line">{tr("notesLine", { notes: i.notes })}</p>}
                </div>
              ))}
            </>
          )}
          {sentSeparate.length > 0 && (
            <>
              <p style={{ marginTop: 10 }}><b>{tr("separateSent")}</b></p>
              {sentSeparate.map((i) => (
                <div key={i.id}>
                  <div className="item"><span>{displayName(i.name)}{i.qty > 1 ? ` ×${i.qty}` : ""}{i.detail ? <span className="detail-line"> · {translateDetail(i.detail)}</span> : ""}</span><span className={`status-pill ${i.status}`}>{statusLabel(i.status)}</span></div>
                  {i.notes && <p className="notes-line">{tr("notesLine", { notes: i.notes })}</p>}
                </div>
              ))}
            </>
          )}
          {pendingBreakfast.length > 0 && (
            <>
              <p style={{ marginTop: 10 }}><b>{tr("breakfasts")}</b></p>
              {pendingBreakfast.map((e) => (
                <div key={e.key}>
                  <div className="item"><span>{displayName(e.name)}{e.detail ? <span className="detail-line"> · {translateDetail(e.detail)}</span> : ""}</span><span className="item-action"><span className="item-price">{mxn(e.priceCents)}</span><button type="button" onClick={() => setExtras(extras.filter((x) => x.key !== e.key))}>{tr("remove")}</button></span></div>
                  <input placeholder={tr("notesPhShort")} value={e.notes ?? ""} onChange={(ev) => setExtras(extras.map((x) => (x.key === e.key ? { ...x, notes: ev.target.value } : x)))} style={{ margin: "4px 0 10px" }} />
                </div>
              ))}
            </>
          )}
          {pendingSeparate.length > 0 && (
            <>
              <p style={{ marginTop: 10 }}><b>{tr("separatePending")}</b></p>
              {pendingSeparate.map((e) => (
                <div key={e.key}>
                  <div className="item"><span>{displayName(e.name)}{(e.qty ?? 1) > 1 ? ` ×${e.qty}` : ""}{e.detail ? <span className="detail-line"> · {translateDetail(e.detail)}</span> : ""}</span><span className="item-action"><span className="item-price">{mxn(e.priceCents * (e.qty ?? 1))}</span><button type="button" onClick={() => setExtras(extras.filter((x) => x.key !== e.key))}>{tr("remove")}</button></span></div>
                  <input placeholder={tr("notesPhShort")} value={e.notes ?? ""} onChange={(ev) => setExtras(extras.map((x) => (x.key === e.key ? { ...x, notes: ev.target.value } : x)))} style={{ margin: "4px 0 10px" }} />
                </div>
              ))}
            </>
          )}
          {extras.length === 0 && sentExtras.length === 0 && (
            <p className="muted">{lunchVisible ? tr("noneYetBoth") : tr("noneYetBreakfast")}</p>
          )}
          {extras.length > 0 && (
            <>
              <p><b>{tr("totalUnsent", { total: mxn(extrasTotal) })}</b>{pendingBreakfast.length > 0 && pendingSeparate.length > 0 ? tr("totalUnsentSplit", { b: mxn(pendingBreakfastTotal), s: mxn(pendingSeparateTotal) }) : ""}</p>
              <button type="button" className="big-btn parpadea-pedir" onClick={sendExtras}>{tr("sendToKitchen")}</button>
            </>
          )}
        </div>

        {pagarPanel}
        </aside>

      </main>
{pedidoOpen && <div className="pedido-backdrop" onClick={() => setPedidoOpen(false)} aria-hidden="true" />}
      {table && (
        <button type="button" className={hasPendingToConfirm ? "pedido-fab confirma" : "pedido-fab"} onClick={() => setPedidoOpen(true)}>
          {hasPendingToConfirm ? tr("fabConfirm") : <>{tr("fabOrder")}{grandTotal > 0 ? ` · ${mxn(grandTotal)}` : ""}</>}
        </button>
      )}
      {/* Botón circular fijo "Asistencia mesero": siempre visible con
          mesa (QR). Llama al mesero; mientras la llamada está pendiente
          muestra "Mesero en camino" y no se puede tocar dos veces. */}
      {table && (
        <button type="button" className="fab-waiter" disabled={Boolean(assistanceCall) || assistanceBusy} onClick={callWaiter}>
          {assistanceCall || assistanceBusy ? tr("waiterComing") : tr("waiterBtn")}
        </button>
      )}
    </div>
  );
}
