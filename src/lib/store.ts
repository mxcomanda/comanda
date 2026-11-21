// Almacén en memoria para desarrollo / demo SIN base de datos.
// En Vercel, los serverless functions no comparten memoria entre instancias:
// por eso en producción hay que usar Postgres (ver src/lib/db.ts y scripts/seed.sql).
// Este store es solo el arranque para probar el flujo sin credenciales.
import { DZIB_BREAKFAST, DZIB_TABLES, DZIB_DAILY_MENU_EXAMPLE, DZIB_SETTINGS } from "@/data/dzib";
import type { Account, OrderItem } from "./types";

export const db = {
  breakfast: [...DZIB_BREAKFAST],
  dailyMenu: DZIB_DAILY_MENU_EXAMPLE,
  tables: [...DZIB_TABLES],
  settings: { ...DZIB_SETTINGS },
  accounts: [] as Account[],
  // PINs por rol: NO hay valores por defecto. El encargado los crea en /dzib/personal
  // (primera vez) y solo Caja los cambia. Se guardan como hash SHA-256 con sal.
  // En producción viven en la tabla staff_pins de Postgres, no aquí.
  staffPins: {} as Record<string, string>,
  nextOrderId: 1,
};
export function newItemId() { return `it-${Date.now()}-${db.nextOrderId++}`; }
export function accountTotal(items: OrderItem[]) {
  return items.filter((i) => i.status !== "cancelado").reduce((s, i) => s + i.priceCents * i.qty, 0);
}
