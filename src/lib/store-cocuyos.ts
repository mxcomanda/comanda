// Almacén en memoria para Taquería Los Cocuyos (desarrollo / demo SIN
// base de datos). Espejo de src/lib/store.ts (Dzib), pero SEPARADO: las
// cuentas, PINs y llamadas de asistencia de Cocuyos nunca se mezclan
// con las de Dzib. En Vercel, con POSTGRES_URL, todo vive en Postgres
// (ver src/lib/pg-cocuyos.ts).
import { COCUYOS_TABLES } from "@/data/cocuyos";
import type { Account, OrderItem } from "./types";
import type { DayCut } from "./daySummary";
import { computeTotal } from "./types";

export const dbCocuyos = {
  tables: [...COCUYOS_TABLES],
  accounts: [] as Account[],
  // Cortes finales del día guardados (solo desarrollo local; en Vercel
  // viven en la tabla daily_cuts de Postgres).
  dayCuts: [] as DayCut[],
  // PINs por rol: NO hay valores por defecto. El encargado los crea en
  // /cocuyos/personal (primera vez) y solo Caja los cambia. Se guardan
  // como hash SHA-256 con sal. En producción viven en staff_pins.
  staffPins: {} as Record<string, string>,
  // Llamadas de asistencia al mesero (botón circular del comensal).
  assistance: [] as { id: string; tableId: number; tableLabel: string; createdAt: string }[],
  nextOrderId: 1,
};
export function newCocuyosItemId() { return `co-${Date.now()}-${dbCocuyos.nextOrderId++}`; }
// Total: suma simple de los ítems (sin corridas ni tiempos). Ver
// computeTotal en lib/types.ts.
export function accountTotal(items: OrderItem[]) {
  return computeTotal(items);
}
