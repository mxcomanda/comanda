// Resumen del día y corte final para Caja.
// "Día" = fecha actual en America/Mexico_City. El total ganado de una mesa
// es la suma de los totales de sus cuentas pagadas del día SIN cortar
// todavía (el total se calcula desde sus order_items con computeTotal,
// porque accounts no guarda un total propio). Una cuenta "cerrada" solo
// cuenta como ganada si tiene método de pago: si el mesero o caja la
// cerró sin cobrar, NO entra en el total ganado y aparece aparte en
// "closedUnpaid" para que caja la vea. Efectivo vs tarjeta sale de
// payment_method de cada cuenta. Las cuentas abiertas del día NO cuentan
// en el total ganado hasta que se paguen.
import { DZIB_TABLES } from "@/data/dzib";
import type { Account } from "./types";

export interface DayTableSummary { tableId: number; tableLabel: string; orders: number; totalCents: number; }
export interface DayOpenAccount { accountId: string; tableLabel: string; status: string; totalCents: number; }
export interface DaySummary {
  date: string;
  perTable: DayTableSummary[]; // siempre las 12 mesas, aunque estén en 0
  totalOrders: number;
  totalCents: number;
  cashCents: number;
  cardCents: number;
  unclassifiedCents: number;
  // Propinas del día (solo tarjeta), SEPARADAS del total de comida: no
  // se mezclan con totalCents/cashCents/cardCents.
  tipCents: number;
  openAccounts: DayOpenAccount[];
  // Cuentas cerradas sin cobrar (el mesero liberó la mesa o caja la
  // cerró antes del pago): su dinero NO está en el total ganado.
  closedUnpaid: DayOpenAccount[];
}
export interface DayCut extends DaySummary {
  id: string;
  closedAt: string; // ISO
  // Cuentas que estaban abiertas y se cerraron en el corte sin cobrar.
  openAccountsClosed: DayOpenAccount[];
}

const MX_TZ = "America/Mexico_City";
export function mexicoDateString(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: MX_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}
export function mexicoTimeString(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-MX", { timeZone: MX_TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch { return iso; }
}

export function computeDaySummary(accounts: Account[], date: string, tables: { id: number; label: string }[] = DZIB_TABLES): DaySummary {
  const todays = accounts.filter((a) => a.createdAt && mexicoDateString(new Date(a.createdAt)) === date && !a.cutDate);
  // Ganado = pagadas, o cerradas CON método de pago (pagadas y luego
  // cerradas). Una cerrada sin método no es dinero ganado.
  const done = todays.filter((a) => a.status === "pagada" || (a.status === "cerrada" && Boolean(a.payment?.method)));
  const closedUnpaid: DayOpenAccount[] = todays
    .filter((a) => a.status === "cerrada" && !a.payment?.method)
    .map((a) => ({ accountId: a.id, tableLabel: a.tableLabel, status: a.status, totalCents: a.totalCents }));
  const perTable: DayTableSummary[] = tables.map((t) => {
    const mine = done.filter((a) => a.tableId === t.id);
    return { tableId: t.id, tableLabel: t.label, orders: mine.length, totalCents: mine.reduce((s, a) => s + a.totalCents, 0) };
  });
  const totalCents = done.reduce((s, a) => s + a.totalCents, 0);
  const cashCents = done.filter((a) => a.payment?.method === "efectivo").reduce((s, a) => s + a.totalCents, 0);
  const cardCents = done.filter((a) => a.payment?.method === "terminal").reduce((s, a) => s + a.totalCents, 0);
  // Propinas: solo de las cuentas ganadas (pagadas/cerradas con método),
  // separadas del total de comida.
  const tipCents = done.reduce((s, a) => s + (a.tipCents ?? 0), 0);
  const openAccounts: DayOpenAccount[] = todays
    .filter((a) => a.status === "abierta" || a.status === "cuenta-pedida")
    .map((a) => ({ accountId: a.id, tableLabel: a.tableLabel, status: a.status, totalCents: a.totalCents }));
  return { date, perTable, totalOrders: done.length, totalCents, cashCents, cardCents, unclassifiedCents: totalCents - cashCents - cardCents, tipCents, openAccounts, closedUnpaid };
}
