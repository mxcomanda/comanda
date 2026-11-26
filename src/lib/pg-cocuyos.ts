// Adaptador Postgres para Taquería Los Cocuyos (restaurant_slug =
// 'cocuyos'). Adaptado de src/lib/pg.ts (Dzib): mismas tablas
// (accounts, order_items, staff_pins, daily_cuts, assistance_calls),
// todas con restaurant_slug, así los dos restaurantes nunca se mezclan.
// Diferencias con Dzib: NO hay siembra de menú (el menú vive en el
// archivo de datos src/data/cocuyos.ts y el servidor lo sirve de ahí),
// NO hay corridas/tiempos ni agua del día, y cada ítem lleva su
// estación ("cocina" = comida, "barra" = bebidas) en la columna
// `station` de order_items. Sin POSTGRES_URL, las rutas usan el store
// en memoria src/lib/store-cocuyos.ts (solo desarrollo local).
import { sql, hasPostgres } from "./db";
import { COCUYOS_TABLES } from "@/data/cocuyos";
import type { Account, OrderItem } from "./types";
import { computeTotal } from "./types";
import { computeDaySummary, mexicoDateString, type DayCut, type DaySummary, type DayTableSummary, type DayOpenAccount } from "./daySummary";

export { hasPostgres };

const RESTAURANT = "cocuyos";

export interface DbAccount extends Account {}

// Un id mal formado no debe tumbar la ruta con un 500 de Postgres (el
// cast ::uuid falla), sino devolver 404.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: string): boolean { return UUID_RE.test(v); }

let columnsPromise: Promise<void> | null = null;
export function ensureColumns(): Promise<void> {
  if (!hasPostgres) return Promise.resolve();
  if (!columnsPromise) {
    columnsPromise = (async () => {
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS change_ready BOOLEAN DEFAULT false`;
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS kitchen_alert BOOLEAN DEFAULT false`;
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS closed_by_mesero BOOLEAN DEFAULT false`;
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS tip_cents INT DEFAULT 0`;
      await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes TEXT`;
      // Estación que prepara el ítem: "cocina" (comida) o "barra"
      // (bebidas). Inofensiva para Dzib, que ignora esta columna.
      await sql`ALTER TABLE order_items ADD COLUMN IF NOT EXISTS station TEXT`;
      await sql`CREATE TABLE IF NOT EXISTS assistance_calls (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_slug TEXT NOT NULL,
        table_id INT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pendiente',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    })().catch((e) => { columnsPromise = null; throw e; });
  }
  return columnsPromise;
}

// ---------- PINs ----------
export async function getStaffPins(): Promise<Record<string, string>> {
  const { rows } = await sql`SELECT role, pin_hash FROM staff_pins WHERE restaurant_slug = ${RESTAURANT}`;
  const pins: Record<string, string> = {};
  for (const r of rows) pins[r.role as string] = r.pin_hash as string;
  return pins;
}

export async function setStaffPins(pins: Record<string, string>): Promise<void> {
  for (const [role, hash] of Object.entries(pins)) {
    await sql`INSERT INTO staff_pins (restaurant_slug, role, pin_hash) VALUES (${RESTAURANT}, ${role}, ${hash})
      ON CONFLICT (restaurant_slug, role) DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now()`;
  }
}

// ---------- Cuentas y pedidos ----------
function tableLabel(tableId: number): string {
  return COCUYOS_TABLES.find((t) => t.id === tableId)?.label ?? `Mesa ${tableId}`;
}

export async function getAccountWithItems(accountId: string): Promise<Account | null> {
  await ensureColumns();
  if (!isUuid(accountId)) return null;
  const { rows } = await sql`SELECT id, table_id, status, payment_method, cash_cents, tip_cents, change_ready, kitchen_alert, closed_by_mesero, created_at FROM accounts WHERE id = ${accountId}::uuid`;
  if (rows.length === 0) return null;
  const a = rows[0];
  const items = await getItems(String(a.id));
  return rowToAccount(a, items);
}

async function getItems(accountId: string): Promise<OrderItem[]> {
  await ensureColumns();
  const { rows } = await sql`SELECT id, name, price_cents, kitchen, status, qty, notes, station FROM order_items WHERE account_id = ${accountId}::uuid ORDER BY created_at ASC`;
  return rows.map((r) => ({
    id: String(r.id), name: r.name as string, priceCents: r.price_cents as number,
    kitchen: r.kitchen as string,
    status: r.status as OrderItem["status"], qty: (r.qty as number) ?? 1,
    notes: (r.notes as string | null) ?? null,
    station: (r.station as "cocina" | "barra" | null) ?? null,
  }));
}

function rowToAccount(a: Record<string, unknown>, items: OrderItem[]): Account {
  return {
    id: String(a.id), tableId: a.table_id as number, tableLabel: tableLabel(a.table_id as number),
    items, totalCents: computeTotal(items), status: (a.status as Account["status"]) ?? "abierta",
    payment: a.payment_method ? { method: a.payment_method as "terminal" | "efectivo", cashCents: (a.cash_cents as number) ?? undefined } : null,
    tipCents: (a.tip_cents as number) ?? 0,
    changeReady: Boolean(a.change_ready), kitchenAlert: Boolean(a.kitchen_alert),
    closedByMesero: Boolean(a.closed_by_mesero),
    createdAt: a.created_at instanceof Date ? a.created_at.toISOString() : String(a.created_at ?? ""),
  };
}

export async function getOrCreateAccount(tableId: number): Promise<Account> {
  await ensureColumns();
  const { rows } = await sql`SELECT id, table_id, status, payment_method, cash_cents, tip_cents, change_ready, kitchen_alert, closed_by_mesero, created_at FROM accounts
    WHERE restaurant_slug = ${RESTAURANT} AND table_id = ${tableId} AND status <> 'cerrada' ORDER BY created_at DESC LIMIT 1`;
  if (rows.length > 0) {
    const items = await getItems(String(rows[0].id));
    return rowToAccount(rows[0], items);
  }
  const created = await sql`INSERT INTO accounts (restaurant_slug, table_id, status) VALUES (${RESTAURANT}, ${tableId}, 'abierta') RETURNING id, table_id, status, payment_method, cash_cents, created_at`;
  return rowToAccount(created.rows[0], []);
}

export async function getOpenAccountByTable(tableId: number): Promise<Account | null> {
  await ensureColumns();
  const { rows } = await sql`SELECT id, table_id, status, payment_method, cash_cents, tip_cents, change_ready, kitchen_alert, closed_by_mesero, created_at FROM accounts
    WHERE restaurant_slug = ${RESTAURANT} AND table_id = ${tableId} AND status <> 'cerrada' ORDER BY created_at DESC LIMIT 1`;
  if (rows.length === 0) return null;
  return rowToAccount(rows[0], await getItems(String(rows[0].id)));
}

// Todo lo de Cocuyos va directo a cocina/barra con estado "pendiente"
// (como lo "por separado" de Dzib): no hay tiempos en espera.
export async function addOrderItems(accountId: string, items: { name: string; priceCents: number; station: "cocina" | "barra"; notes?: string | null; qty?: number }[]): Promise<Account> {
  await ensureColumns();
  for (const it of items) {
    await sql`INSERT INTO order_items (account_id, name, price_cents, kitchen, status, qty, notes, station)
      VALUES (${accountId}::uuid, ${String(it.name)}, ${Number(it.priceCents) || 0}, ${it.station}, 'pendiente', ${Math.max(1, Math.floor(Number(it.qty) || 1))}, ${it.notes?.trim() ? it.notes.trim().slice(0, 200) : null}, ${it.station})`;
  }
  const acc = await getAccountWithItems(accountId);
  if (!acc) throw new Error("Cuenta no encontrada tras crear el pedido");
  return acc;
}

// Cocina y barra: todos los ítems no entregados de cuentas abiertas.
// `station` opcional filtra una sola estación ("cocina" o "barra").
export async function getKitchenItems(station?: string | null): Promise<(OrderItem & { table: string; accountId: string })[]> {
  await ensureColumns();
  const { rows } = station === "cocina" || station === "barra"
    ? await sql`SELECT oi.id, oi.name, oi.price_cents, oi.kitchen, oi.status, oi.qty, oi.notes, oi.station, oi.account_id, a.table_id
      FROM order_items oi JOIN accounts a ON a.id = oi.account_id
      WHERE a.restaurant_slug = ${RESTAURANT} AND oi.status <> 'espera' AND oi.status <> 'cancelado'
      AND a.status IN ('abierta', 'cuenta-pedida') AND oi.station = ${station} ORDER BY oi.created_at ASC`
    : await sql`SELECT oi.id, oi.name, oi.price_cents, oi.kitchen, oi.status, oi.qty, oi.notes, oi.station, oi.account_id, a.table_id
      FROM order_items oi JOIN accounts a ON a.id = oi.account_id
      WHERE a.restaurant_slug = ${RESTAURANT} AND oi.status <> 'espera' AND oi.status <> 'cancelado'
      AND a.status IN ('abierta', 'cuenta-pedida') ORDER BY oi.created_at ASC`;
  return rows.map((r) => ({
    id: String(r.id), name: r.name as string, priceCents: r.price_cents as number,
    kitchen: r.kitchen as string,
    status: r.status as OrderItem["status"], qty: (r.qty as number) ?? 1,
    notes: (r.notes as string | null) ?? null,
    station: (r.station as "cocina" | "barra" | null) ?? null,
    table: tableLabel(r.table_id as number), accountId: String(r.account_id),
  }));
}

export async function getAllAccounts(): Promise<Account[]> {
  await ensureColumns();
  const { rows } = await sql`SELECT id, table_id, status, payment_method, cash_cents, tip_cents, change_ready, kitchen_alert, closed_by_mesero, created_at FROM accounts
    WHERE restaurant_slug = ${RESTAURANT} ORDER BY created_at DESC LIMIT 50`;
  const out: Account[] = [];
  for (const a of rows) out.push(rowToAccount(a, await getItems(String(a.id))));
  return out;
}

// ---------- Resumen del día y corte final (solo Caja) ----------
let dayCutSchemaPromise: Promise<void> | null = null;
export function ensureDayCutSchema(): Promise<void> {
  if (!hasPostgres) return Promise.resolve();
  if (!dayCutSchemaPromise) {
    dayCutSchemaPromise = (async () => {
      await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS cut_date DATE`;
      await sql`ALTER TABLE daily_cuts ADD COLUMN IF NOT EXISTS tip_cents INT DEFAULT 0`;
      await sql`CREATE TABLE IF NOT EXISTS daily_cuts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        restaurant_slug TEXT NOT NULL,
        cut_date DATE NOT NULL,
        closed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        total_orders INT NOT NULL DEFAULT 0,
        total_cents INT NOT NULL DEFAULT 0,
        cash_cents INT NOT NULL DEFAULT 0,
        card_cents INT NOT NULL DEFAULT 0,
        per_table JSONB NOT NULL DEFAULT '[]'::jsonb,
        open_accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
        UNIQUE (restaurant_slug, cut_date)
      )`;
    })().catch((e) => { dayCutSchemaPromise = null; throw e; });
  }
  return dayCutSchemaPromise;
}

function cutRowToCut(r: Record<string, unknown>): DayCut {
  const perTable = (r.per_table as DayTableSummary[]) ?? [];
  const openAccounts = (r.open_accounts as DayOpenAccount[]) ?? [];
  const totalCents = (r.total_cents as number) ?? 0;
  const cashCents = (r.cash_cents as number) ?? 0;
  const cardCents = (r.card_cents as number) ?? 0;
  return {
    id: String(r.id),
    date: r.cut_date instanceof Date ? r.cut_date.toISOString().slice(0, 10) : String(r.cut_date),
    closedAt: r.closed_at instanceof Date ? r.closed_at.toISOString() : String(r.closed_at),
    perTable, totalOrders: (r.total_orders as number) ?? 0, totalCents, cashCents, cardCents,
    unclassifiedCents: totalCents - cashCents - cardCents,
    tipCents: (r.tip_cents as number) ?? 0,
    openAccounts, openAccountsClosed: openAccounts,
    closedUnpaid: [],
  };
}

export async function getTodayCut(): Promise<DayCut | null> {
  await ensureDayCutSchema();
  const { rows } = await sql`SELECT id, cut_date, closed_at, total_orders, total_cents, cash_cents, card_cents, per_table, open_accounts FROM daily_cuts
    WHERE restaurant_slug = ${RESTAURANT} AND cut_date = (now() AT TIME ZONE 'America/Mexico_City')::date ORDER BY closed_at DESC LIMIT 1`;
  if (rows.length === 0) return null;
  return cutRowToCut(rows[0]);
}

export async function getDayData(): Promise<{ summary: DaySummary; cut: DayCut | null }> {
  await ensureDayCutSchema();
  const date = mexicoDateString();
  const { rows } = await sql`SELECT id, table_id, status, payment_method, cash_cents, tip_cents, change_ready, kitchen_alert, closed_by_mesero, created_at FROM accounts
    WHERE restaurant_slug = ${RESTAURANT}
    AND (created_at AT TIME ZONE 'America/Mexico_City')::date = (now() AT TIME ZONE 'America/Mexico_City')::date
    AND cut_date IS NULL ORDER BY created_at ASC`;
  const accounts: Account[] = [];
  for (const a of rows) accounts.push(rowToAccount(a, await getItems(String(a.id))));
  const summary = computeDaySummary(accounts, date, COCUYOS_TABLES);
  const cut = await getTodayCut();
  return { summary, cut };
}

export async function saveDayCut(): Promise<{ cut: DayCut } | { error: string; cut?: DayCut }> {
  await ensureDayCutSchema();
  const existing = await getTodayCut();
  if (existing) return { error: "Ya se hizo el corte de hoy.", cut: existing };
  const { summary } = await getDayData();
  const openClosed = [...summary.openAccounts, ...summary.closedUnpaid];
  for (const o of openClosed) {
    await sql`UPDATE accounts SET status = 'cerrada' WHERE id = ${o.accountId}::uuid`;
  }
  await sql`UPDATE accounts SET cut_date = (now() AT TIME ZONE 'America/Mexico_City')::date
    WHERE restaurant_slug = ${RESTAURANT}
    AND (created_at AT TIME ZONE 'America/Mexico_City')::date = (now() AT TIME ZONE 'America/Mexico_City')::date
    AND cut_date IS NULL`;
  try {
    const inserted = await sql`INSERT INTO daily_cuts (restaurant_slug, cut_date, total_orders, total_cents, cash_cents, card_cents, tip_cents, per_table, open_accounts)
      VALUES (${RESTAURANT}, (now() AT TIME ZONE 'America/Mexico_City')::date, ${summary.totalOrders}, ${summary.totalCents}, ${summary.cashCents}, ${summary.cardCents}, ${summary.tipCents}, ${JSON.stringify(summary.perTable)}::jsonb, ${JSON.stringify(openClosed)}::jsonb)
      RETURNING id, cut_date, closed_at, total_orders, total_cents, cash_cents, card_cents, tip_cents, per_table, open_accounts`;
    return { cut: cutRowToCut(inserted.rows[0]) };
  } catch {
    const again = await getTodayCut();
    if (again) return { error: "Ya se hizo el corte de hoy.", cut: again };
    throw new Error("No se pudo guardar el corte");
  }
}

// ---------- Estados, cobro y avisos (cadena cocina → mesero → caja) ----------
// Cocina/barra avanza: pendiente → preparando → listo. La entrega NO la
// marca cocina: un platillo listo se queda en "listo" hasta que el
// MESERO lo marca entregado desde su vista.
const NEXT_STATUS: Record<string, string> = {
  pendiente: "preparando",
  preparando: "listo",
};

export async function advanceItemStatus(itemId: string): Promise<{ status: string } | { error: string }> {
  await ensureColumns();
  if (!isUuid(itemId)) return { error: "Platillo no encontrado" };
  const { rows } = await sql`SELECT id, status FROM order_items WHERE id = ${itemId}::uuid`;
  if (rows.length === 0) return { error: "Platillo no encontrado" };
  const current = String(rows[0].status);
  const next = NEXT_STATUS[current];
  if (!next) return { error: `El platillo ya está ${current}, no avanza más` };
  await sql`UPDATE order_items SET status = ${next} WHERE id = ${itemId}::uuid`;
  return { status: next };
}

export async function setItemStatus(itemId: string, status: string): Promise<boolean> {
  await ensureColumns();
  if (!isUuid(itemId)) return false;
  const { rowCount } = await sql`UPDATE order_items SET status = ${status} WHERE id = ${itemId}::uuid`;
  return (rowCount ?? 0) > 0;
}

export async function setAccountPayment(accountId: string, method: "terminal" | "efectivo", cashCents?: number): Promise<Account | null> {
  await ensureColumns();
  if (!isUuid(accountId)) return null;
  await sql`UPDATE accounts SET status = 'cuenta-pedida', payment_method = ${method}, cash_cents = ${cashCents ?? null} WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

export async function setAccountStatus(accountId: string, status: string): Promise<Account | null> {
  await ensureColumns();
  if (!isUuid(accountId)) return null;
  await sql`UPDATE accounts SET status = ${status} WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

// Cierre CON PAGO por Caja (única forma de liberar una mesa): Caja
// señala el método (Tarjeta o Efectivo) y, con tarjeta, la propina. La
// cuenta queda cerrada CON método de pago, así el resumen del día la
// cuenta como ganada. Con efectivo se conserva el cash_cents que el
// comensal ya registró al pedir la cuenta; con tarjeta el efectivo
// queda en NULL. La propina solo se guarda con tarjeta.
export async function closeAccountPaid(accountId: string, method: "terminal" | "efectivo", tipCents: number, cashCents?: number): Promise<Account | null> {
  await ensureColumns();
  if (!isUuid(accountId)) return null;
  const tip = Math.max(0, Math.floor(tipCents) || 0);
  await sql`UPDATE accounts SET status = 'cerrada', payment_method = ${method},
    tip_cents = ${method === "terminal" ? tip : 0},
    cash_cents = CASE WHEN ${method} = 'efectivo' THEN COALESCE(${cashCents ?? null}, cash_cents) ELSE NULL END
    WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

// Propinas del día (sin cortar) por lado del salón, para la vista de
// meseros: izquierda = mesas 1–5, derecha = mesas 6–10.
export async function getTipsBySide(): Promise<{ left: number; right: number }> {
  await ensureColumns();
  const { rows } = await sql`SELECT table_id, COALESCE(SUM(tip_cents), 0) AS tips FROM accounts
    WHERE restaurant_slug = ${RESTAURANT}
    AND (created_at AT TIME ZONE 'America/Mexico_City')::date = (now() AT TIME ZONE 'America/Mexico_City')::date
    AND cut_date IS NULL AND tip_cents > 0 GROUP BY table_id`;
  let left = 0, right = 0;
  for (const r of rows) {
    const t = Number(r.tips ?? 0);
    if ((r.table_id as number) <= 5) left += t; else right += t;
  }
  return { left, right };
}

export async function closeAccountByMesero(accountId: string): Promise<Account | null> {
  await ensureColumns();
  if (!isUuid(accountId)) return null;
  await sql`UPDATE accounts SET status = 'cerrada', closed_by_mesero = true WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

export async function setChangeReady(accountId: string, ready: boolean): Promise<Account | null> {
  await ensureColumns();
  if (!isUuid(accountId)) return null;
  await sql`UPDATE accounts SET change_ready = ${ready} WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

export async function setKitchenAlert(accountId: string, alert: boolean): Promise<Account | null> {
  await ensureColumns();
  if (!isUuid(accountId)) return null;
  await sql`UPDATE accounts SET kitchen_alert = ${alert} WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

export async function getKitchenAlerts(): Promise<{ accountId: string; tableLabel: string }[]> {
  await ensureColumns();
  const { rows } = await sql`SELECT id, table_id FROM accounts WHERE restaurant_slug = ${RESTAURANT} AND kitchen_alert = true AND status <> 'cerrada' ORDER BY created_at ASC`;
  return rows.map((r) => ({ accountId: String(r.id), tableLabel: tableLabel(r.table_id as number) }));
}

// ---------- Asistencia al mesero (botón circular del comensal) ----------
export interface AssistanceCall { id: string; tableId: number; tableLabel: string; createdAt: string; }

function assistanceRowToCall(r: Record<string, unknown>): AssistanceCall {
  return {
    id: String(r.id), tableId: r.table_id as number, tableLabel: tableLabel(r.table_id as number),
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ""),
  };
}

export async function requestAssistance(tableId: number): Promise<AssistanceCall> {
  await ensureColumns();
  const open = await getOpenAssistanceCallForTable(tableId);
  if (open) return open;
  const { rows } = await sql`INSERT INTO assistance_calls (restaurant_slug, table_id, status)
    VALUES (${RESTAURANT}, ${tableId}, 'pendiente') RETURNING id, table_id, created_at`;
  return assistanceRowToCall(rows[0]);
}

export async function getOpenAssistanceCalls(): Promise<AssistanceCall[]> {
  await ensureColumns();
  const { rows } = await sql`SELECT id, table_id, created_at FROM assistance_calls
    WHERE restaurant_slug = ${RESTAURANT} AND status = 'pendiente' ORDER BY created_at ASC`;
  return rows.map(assistanceRowToCall);
}

export async function getOpenAssistanceCallForTable(tableId: number): Promise<AssistanceCall | null> {
  await ensureColumns();
  const { rows } = await sql`SELECT id, table_id, created_at FROM assistance_calls
    WHERE restaurant_slug = ${RESTAURANT} AND table_id = ${tableId} AND status = 'pendiente' ORDER BY created_at DESC LIMIT 1`;
  if (rows.length === 0) return null;
  return assistanceRowToCall(rows[0]);
}

export async function attendAssistance(callId: string): Promise<boolean> {
  await ensureColumns();
  if (!isUuid(callId)) return false;
  const { rowCount } = await sql`UPDATE assistance_calls SET status = 'atendido' WHERE id = ${callId}::uuid AND status = 'pendiente'`;
  return (rowCount ?? 0) > 0;
}
