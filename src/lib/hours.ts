// Horarios de servicio de Dzib, en hora de Ciudad de México
// (America/Mexico_City), no en la hora del dispositivo del comensal
// ni del servidor. Desayunos hasta la 1:00 pm; comida corrida a
// partir de la 1:00 pm. Lo pedido por separado no tiene horario.
// Para pruebas locales, la variable DZIB_FAKE_MEXICO_HOUR (0-23)
// simula la hora; en Vercel no está definida y no afecta nada.
export const MX_TZ = "America/Mexico_City";
export const BREAKFAST_CUTOFF_HOUR = 13; // 1:00 pm

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

// Desayunos: se pueden pedir antes de la 1:00 pm.
export function breakfastOpen(now: Date = new Date()): boolean {
  return mexicoHour(now) < BREAKFAST_CUTOFF_HOUR;
}

// Comida corrida: se habilita a partir de la 1:00 pm.
export function lunchOpen(now: Date = new Date()): boolean {
  return mexicoHour(now) >= BREAKFAST_CUTOFF_HOUR;
}
