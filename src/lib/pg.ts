// Adaptador Postgres para Dzib. Cuando POSTGRES_URL está presente (Vercel),
// todo vive en la base (staff_pins, accounts, order_items, menu_items,
// daily_menus) y sobrevive a cualquier instancia serverless. Sin
// POSTGRES_URL, las rutas usan el store en memoria (solo desarrollo local).
import { sql, hasPostgres } from "./db";
import { DZIB_BREAKFAST, DZIB_DAILY_MENU_TODAY, DZIB_SETTINGS, DZIB_TABLES } from "@/data/dzib";
import type { Account, OrderItem } from "./types";
import { computeTotal } from "./types";

export { hasPostgres };

const RESTAURANT = "dzib";

export interface DbAccount extends Account {}

// ---------- Siembra inicial ----------
let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!hasPostgres) return Promise.resolve();
  if (!seedPromise) seedPromise = seedOnce().catch((e) => {
    seedPromise = null;
    throw e;
  });
  return seedPromise;
}

async function seedOnce(): Promise<void> {
  // Columnas para el flujo de cobro y avisos entre personal (si la base
  // se creó con el esquema original, que no las tiene).
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS change_ready BOOLEAN DEFAULT false`;
  await sql`ALTER TABLE accounts ADD COLUMN IF NOT EXISTS kitchen_alert BOOLEAN DEFAULT false`;
  // Idempotente y a prueba de instancias concurrentes: los desayunos se
  // insertan con ON CONFLICT DO NOTHING, y el menú del día se reemplaza
  // completo cada vez (así un cambio de menú en el código se refleja en la
  // base). Importante: los desayunos usan ids explícitos 24-71, por lo que
  // hay que avanzar la secuencia SERIAL antes de insertar los platillos
  // del día, o sus ids chocarían con los desayunos (ese fue el 500 inicial).
  for (const b of DZIB_BREAKFAST) {
    await sql`INSERT INTO menu_items (id, restaurant_slug, name, description, category, price_cents, kitchen, tiempo, is_available)
      VALUES (${b.id}, ${RESTAURANT}, ${b.name}, ${b.description}, ${b.category}, ${b.priceCents}, ${b.kitchen}, NULL, ${b.isAvailable})
      ON CONFLICT (id) DO NOTHING`;
  }
  await sql`SELECT setval('menu_items_id_seq', (SELECT COALESCE(MAX(id), 1) FROM menu_items), true)`;
  // Menú del día vigente (categoría 'comida', un platillo por tiempo/precio).
  await sql`DELETE FROM menu_items WHERE restaurant_slug = ${RESTAURANT} AND category = 'comida'`;
  for (const it of DZIB_DAILY_MENU_TODAY.items) {
    await sql`INSERT INTO menu_items (restaurant_slug, name, description, category, price_cents, kitchen, tiempo, is_available)
      VALUES (${RESTAURANT}, ${it.name}, '', 'comida', ${it.soloPriceCents}, ${it.kitchen}, ${it.tiempo}, true)`;
  }
  await sql`INSERT INTO daily_menus (restaurant_slug, date, sencillo_price_cents, special_dish, special_price_cents, notes, is_published, is_example)
    VALUES (${RESTAURANT}, ${DZIB_DAILY_MENU_TODAY.date}, ${DZIB_DAILY_MENU_TODAY.sencilloPriceCents}, ${DZIB_DAILY_MENU_TODAY.specialDish}, ${DZIB_DAILY_MENU_TODAY.specialPriceCents}, ${DZIB_DAILY_MENU_TODAY.notes}, true, false)
    ON CONFLICT (restaurant_slug, date) DO UPDATE SET sencillo_price_cents = EXCLUDED.sencillo_price_cents, special_dish = EXCLUDED.special_dish, special_price_cents = EXCLUDED.special_price_cents, notes = EXCLUDED.notes, is_published = true, is_example = false`;
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
  return DZIB_TABLES.find((t) => t.id === tableId)?.label ?? `Mesa ${tableId}`;
}

export async function getAccountWithItems(accountId: string): Promise<Account | null> {
  const { rows } = await sql`SELECT id, table_id, status, payment_method, cash_cents, change_ready, kitchen_alert, created_at FROM accounts WHERE id = ${accountId}::uuid`;
  if (rows.length === 0) return null;
  const a = rows[0];
  const items = await getItems(String(a.id));
  return rowToAccount(a, items);
}

async function getItems(accountId: string): Promise<OrderItem[]> {
  const { rows } = await sql`SELECT id, name, price_cents, kitchen, tiempo, status, qty FROM order_items WHERE account_id = ${accountId}::uuid ORDER BY created_at ASC`;
  return rows.map((r) => ({
    id: String(r.id), name: r.name as string, priceCents: r.price_cents as number,
    kitchen: r.kitchen as string, tiempo: (r.tiempo as OrderItem["tiempo"]) ?? null,
    status: r.status as OrderItem["status"], qty: (r.qty as number) ?? 1,
  }));
}

function rowToAccount(a: Record<string, unknown>, items: OrderItem[]): Account {
  return {
    id: String(a.id), tableId: a.table_id as number, tableLabel: tableLabel(a.table_id as number),
    items, totalCents: computeTotal(items), status: (a.status as Account["status"]) ?? "abierta",
    payment: a.payment_method ? { method: a.payment_method as "terminal" | "efectivo", cashCents: (a.cash_cents as number) ?? undefined } : null,
    changeReady: Boolean(a.change_ready), kitchenAlert: Boolean(a.kitchen_alert),
    createdAt: a.created_at instanceof Date ? a.created_at.toISOString() : String(a.created_at ?? ""),
  };
}

export async function getOrCreateAccount(tableId: number): Promise<Account> {
  const { rows } = await sql`SELECT id, table_id, status, payment_method, cash_cents, change_ready, kitchen_alert, created_at FROM accounts
    WHERE restaurant_slug = ${RESTAURANT} AND table_id = ${tableId} AND status <> 'cerrada' ORDER BY created_at DESC LIMIT 1`;
  if (rows.length > 0) {
    const items = await getItems(String(rows[0].id));
    return rowToAccount(rows[0], items);
  }
  const created = await sql`INSERT INTO accounts (restaurant_slug, table_id, status) VALUES (${RESTAURANT}, ${tableId}, 'abierta') RETURNING id, table_id, status, payment_method, cash_cents, created_at`;
  return rowToAccount(created.rows[0], []);
}

export async function addOrderItems(accountId: string, items: { name: string; priceCents: number; tiempo?: string | null }[]): Promise<Account> {
  for (const it of items) {
    const isCourse = Boolean(it.tiempo);
    await sql`INSERT INTO order_items (account_id, name, price_cents, kitchen, tiempo, status, qty)
      VALUES (${accountId}::uuid, ${String(it.name)}, ${Number(it.priceCents) || 0}, 'cocina-a', ${it.tiempo ?? null}, ${isCourse ? "espera" : "pendiente"}, 1)`;
  }
  const acc = await getAccountWithItems(accountId);
  if (!acc) throw new Error("Cuenta no encontrada tras crear el pedido");
  return acc;
}

export async function requestCourse(accountId: string, tiempo: string): Promise<{ items: string[] } | { error: string }> {
  const acc = await getAccountWithItems(accountId);
  if (!acc) return { error: "Cuenta no encontrada" };
  const ORDER = ["primero", "segundo", "tercero"];
  const idx = ORDER.indexOf(tiempo);
  if (idx < 0) return { error: "Tiempo no válido" };
  for (let i = 0; i < idx; i++) {
    const prev = acc.items.filter((it) => it.tiempo === ORDER[i]);
    if (prev.length > 0 && prev.every((it) => it.status === "espera"))
      return { error: `Primero pide el ${ORDER[i]} tiempo` };
  }
  const waiting = acc.items.filter((it) => it.tiempo === tiempo && it.status === "espera");
  if (waiting.length === 0) return { error: "No hay platillos en espera para ese tiempo" };
  for (const it of waiting) {
    await sql`UPDATE order_items SET status = 'pendiente' WHERE id = ${it.id}::uuid`;
  }
  return { items: waiting.map((i) => i.name) };
}

export async function getKitchenItems(kitchen: string): Promise<(OrderItem & { table: string; accountId: string })[]> {
  const { rows } = await sql`SELECT oi.id, oi.name, oi.price_cents, oi.kitchen, oi.tiempo, oi.status, oi.qty, oi.account_id, a.table_id
    FROM order_items oi JOIN accounts a ON a.id = oi.account_id
    WHERE a.restaurant_slug = ${RESTAURANT} AND oi.status <> 'espera' AND oi.status <> 'cancelado'
    AND (oi.kitchen = ${kitchen} OR oi.kitchen = 'ambas') ORDER BY oi.created_at ASC`;
  return rows.map((r) => ({
    id: String(r.id), name: r.name as string, priceCents: r.price_cents as number,
    kitchen: r.kitchen as string, tiempo: (r.tiempo as OrderItem["tiempo"]) ?? null,
    status: r.status as OrderItem["status"], qty: (r.qty as number) ?? 1,
    table: tableLabel(r.table_id as number), accountId: String(r.account_id),
  }));
}

export async function getAllAccounts(): Promise<Account[]> {
  const { rows } = await sql`SELECT id, table_id, status, payment_method, cash_cents, change_ready, kitchen_alert, created_at FROM accounts
    WHERE restaurant_slug = ${RESTAURANT} ORDER BY created_at DESC LIMIT 50`;
  const out: Account[] = [];
  for (const a of rows) out.push(rowToAccount(a, await getItems(String(a.id))));
  return out;
}

// ---------- Menú desde la base ----------
export async function getMenuFromDb() {
  await ensureSeeded();
  const breakfast = await sql`SELECT id, name, description, category, price_cents, kitchen, is_available FROM menu_items
    WHERE restaurant_slug = ${RESTAURANT} AND category <> 'comida' ORDER BY id ASC`;
  const comida = await sql`SELECT id, name, category, price_cents, kitchen, tiempo FROM menu_items
    WHERE restaurant_slug = ${RESTAURANT} AND category = 'comida' ORDER BY id ASC`;
  const daily = await sql`SELECT date, sencillo_price_cents, special_dish, special_price_cents, notes, is_published, is_example FROM daily_menus
    WHERE restaurant_slug = ${RESTAURANT} ORDER BY date DESC LIMIT 1`;
  const d = daily.rows[0];
  return {
    breakfast: breakfast.rows.map((r) => ({
      id: r.id as number, name: r.name as string, description: (r.description as string) ?? "",
      category: r.category as string, priceCents: r.price_cents as number,
      kitchen: r.kitchen as string, isAvailable: (r.is_available as boolean) ?? true,
    })),
    dailyMenu: d ? {
      date: d.date instanceof Date ? d.date.toISOString().slice(0, 10) : String(d.date),
      isExample: Boolean(d.is_example), notes: (d.notes as string) ?? "",
      sencilloPriceCents: d.sencillo_price_cents as number,
      specialDish: (d.special_dish as string) ?? "", specialPriceCents: d.special_price_cents as number,
      items: comida.rows.map((r) => ({
        id: r.id as number, name: r.name as string, tiempo: r.tiempo as string,
        soloPriceCents: r.price_cents as number, kitchen: r.kitchen as string,
      })),
    } : DZIB_DAILY_MENU_TODAY,
    tables: DZIB_TABLES,
    settings: DZIB_SETTINGS,
  };
}

// ---------- Estados, cobro y avisos (cadena cocina → mesero → caja) ----------
const NEXT_STATUS: Record<string, string> = {
  pendiente: "preparando",
  preparando: "listo",
  listo: "entregado",
};

export async function advanceItemStatus(itemId: string): Promise<{ status: string } | { error: string }> {
  const { rows } = await sql`SELECT id, status FROM order_items WHERE id = ${itemId}::uuid`;
  if (rows.length === 0) return { error: "Platillo no encontrado" };
  const current = String(rows[0].status);
  const next = NEXT_STATUS[current];
  if (!next) return { error: `El platillo ya está ${current}, no avanza más` };
  await sql`UPDATE order_items SET status = ${next} WHERE id = ${itemId}::uuid`;
  return { status: next };
}

export async function setItemStatus(itemId: string, status: string): Promise<boolean> {
  const { rowCount } = await sql`UPDATE order_items SET status = ${status} WHERE id = ${itemId}::uuid`;
  return (rowCount ?? 0) > 0;
}

export async function setAccountPayment(accountId: string, method: "terminal" | "efectivo", cashCents?: number): Promise<Account | null> {
  await sql`UPDATE accounts SET status = 'cuenta-pedida', payment_method = ${method}, cash_cents = ${cashCents ?? null} WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

export async function setAccountStatus(accountId: string, status: string): Promise<Account | null> {
  await sql`UPDATE accounts SET status = ${status} WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

export async function setChangeReady(accountId: string, ready: boolean): Promise<Account | null> {
  await sql`UPDATE accounts SET change_ready = ${ready} WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

export async function setKitchenAlert(accountId: string, alert: boolean): Promise<Account | null> {
  await sql`UPDATE accounts SET kitchen_alert = ${alert} WHERE id = ${accountId}::uuid`;
  return getAccountWithItems(accountId);
}

export async function getKitchenAlerts(): Promise<{ accountId: string; tableLabel: string }[]> {
  const { rows } = await sql`SELECT id, table_id FROM accounts WHERE restaurant_slug = ${RESTAURANT} AND kitchen_alert = true AND status <> 'cerrada' ORDER BY created_at ASC`;
  return rows.map((r) => ({ accountId: String(r.id), tableLabel: tableLabel(r.table_id as number) }));
}
