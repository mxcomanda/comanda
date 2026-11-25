// Horarios de servicio de Dzib, en hora de Ciudad de México
// (America/Mexico_City), no en la hora del dispositivo del comensal
// ni del servidor. Desayunos TODO el día, sin límite de horario, por
// decisión del dueño (25 nov 2026) hasta que él diga lo contrario;
// comida corrida a partir de la 1:00 pm. Lo pedido por separado no
// tiene horario.
// Para pruebas locales, la variable DZIB_FAKE_MEXICO_HOUR (0-23)
// simula la hora; en Vercel no está definida y no afecta nada.
export const MX_TZ = "America/Mexico_City";
export const LUNCH_START_HOUR = 13; // 1:00 pm
// Desayunos abiertos todo el día: bandera clara para volver a poner
// el corte si el dueño lo pide (bastaría con ponerla en false y
// restaurar el corte en breakfastOpen).
export const BREAKFAST_ALL_DAY = true;

export function mexicoHour(now: Date = new Date()): number {
  const raw = typeof process !== "undefined" ? process.env.DZIB_FAKE_MEXICO_HOUR : undefined;
  if (raw !== undefined && raw !== "") {
    const fake = Number(raw);
    if (Number.isInteger(fake) && fake >= 0 && fake <= 23) return fake;
  }
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: MX_TZ, hour: "numeric", hour12: false }).format(now)
  );
}

// Desayunos: abiertos todo el día (BREAKFAST_ALL_DAY). Si el dueño
// pide volver al corte de la 1:00 pm, poner BREAKFAST_ALL_DAY en false
// y restaurar: return mexicoHour(now) < LUNCH_START_HOUR;
export function breakfastOpen(now: Date = new Date()): boolean {
  if (BREAKFAST_ALL_DAY) return true;
  return mexicoHour(now) < LUNCH_START_HOUR;
}

// Comida corrida: se habilita a partir de la 1:00 pm.
export function lunchOpen(now: Date = new Date()): boolean {
  return mexicoHour(now) >= LUNCH_START_HOUR;
}
