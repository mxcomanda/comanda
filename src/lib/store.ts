// Almacén en memoria para desarrollo / demo SIN base de datos.
// En Vercel, los serverless functions no comparten memoria entre instancias:
// por eso en producción hay que usar Postgres (ver src/lib/db.ts y scripts/seed.sql).
// Este store es solo el arranque para probar el flujo sin credenciales.
import { DZIB_BREAKFAST, DZIB_TABLES, DZIB_DAILY_MENU_EXAMPLE, DZIB_SETTINGS } from "@/data/dzib";
import type { Account, OrderItem } from "./types";
import type { DayCut } from "./daySummary";
import { computeTotal } from "./types";

export const db = {
  breakfast: [...DZIB_BREAKFAST],
  dailyMenu: DZIB_DAILY_MENU_EXAMPLE,
  tables: [...DZIB_TABLES],
  settings: { ...DZIB_SETTINGS },
  accounts: [] as Account[],
  // Cortes finales del día guardados (solo desarrollo local; en Vercel
  // viven en la tabla daily_cuts de Postgres).
  dayCuts: [] as DayCut[],
  // PINs por rol: NO hay valores por defecto. El encargado los crea en /dzib/personal
  // (primera vez) y solo Caja los cambia. Se guardan como hash SHA-256 con sal.
  // En producción viven en la tabla staff_pins de Postgres, no aquí.
  staffPins: {} as Record<string, string>,
  // Llamadas de asistencia al mesero (botón circular del comensal).
  // Solo desarrollo local; en Vercel viven en assistance_calls.
  assistance: [] as { id: string; tableId: number; tableLabel: string; createdAt: string }[],
  nextOrderId: 1,
};
export function newItemId() { return `it-${Date.now()}-${db.nextOrderId++}`; }
// Total con la regla de la comida corrida: 3 tiempos = sencillo $91,
// menos tiempos = suma de cada uno. Ver computeTotal en lib/types.ts.
export function accountTotal(items: OrderItem[]) {
  return computeTotal(items);
}
