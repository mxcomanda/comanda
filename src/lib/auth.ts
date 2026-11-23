// Roles y PINs (4-8 dígitos, uno por rol, todos distintos, sin PIN por defecto).
// El PIN nunca se guarda en claro: se guarda SHA-256(pin + sal).
// La sesión del personal es una cookie httpOnly firmada con STAFF_SESSION_SECRET.
// El control es EN EL SERVIDOR (API routes): el cliente solo esconde botones.
//
// SESIÓN MULTI-ROL: la cookie guarda TODOS los roles con los que se ha
// entrado en ese navegador (cocina, mesero, caja), no solo el último. Antes
// la cookie guardaba un solo rol y al entrar como Meseros se sobrescribía
// la sesión de Cocina/Caja: por eso "se cerraba la sesión" al abrir
// Meseros desde /dzib/personal. Ahora cada login AGREGA su rol a la
// sesión existente en vez de reemplazarla.
// La sesión es persistente: dura 1 año y cada login la renueva (nuevo
// timestamp), así que una vez iniciada no se cierra sola. Seguir pidiendo
// el PIN para entrar: la seguridad está en el login, no en caducar la sesión.
// Compatibilidad: los tokens viejos de un solo rol (dzib:cocina:ts:sig)
// siguen siendo válidos y al primer login se convierten al formato multi-rol.
import { createHash, createHmac } from "crypto";
export type Role = "cocina" | "mesero" | "caja";
const SALT = "comanda-staff-salt-v1";
// 1 año: sesión persistente (antes 12 h, que además de corta se perdía
// al entrar con otro rol). Cada login renueva el timestamp.
export const SESSION_MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
export const SESSION_MAX_AGE_SECS = 365 * 24 * 60 * 60;
const ALL_ROLES: Role[] = ["caja", "cocina", "mesero"]; // orden canónico (caja primero = mayor privilegio)
export function hashPin(pin: string) {
  return createHash("sha256").update(`${SALT}:${pin}`).digest("hex");
}
export function isValidPinFormat(pin: string) { return /^\d{4,8}$/.test(pin); }

function signPayload(payload: string): string {
  const secret = process.env.STAFF_SESSION_SECRET || "dev-only-change-me";
  return createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
}

// Decodifica y valida un token de sesión (formato nuevo multi-rol o viejo
// de un solo rol). Devuelve los roles y el timestamp, o null si es inválido
// o caducado.
export function parseSession(token: string | undefined, restaurant: string): { roles: Role[]; ts: number } | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const lastColon = decoded.lastIndexOf(":");
    if (lastColon < 0) return null;
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);
    if (sig !== signPayload(payload)) return null;
    const parts = payload.split(":");
    if (parts[0] !== restaurant) return null;
    let roles: Role[] = [];
    let ts = 0;
    if (parts[1]?.startsWith("roles=")) {
      // Nuevo formato: dzib:roles=cocina,mesero:1712345678901
      roles = parts[1].slice("roles=".length).split(",").filter((r): r is Role => (["cocina", "mesero", "caja"] as string[]).includes(r));
      ts = Number(parts[2]);
    } else {
      // Formato viejo de un solo rol: dzib:cocina:1712345678901
      if (!(["cocina", "mesero", "caja"] as string[]).includes(parts[1])) return null;
      roles = [parts[1] as Role];
      ts = Number(parts[2]);
    }
    if (roles.length === 0 || !Number.isFinite(ts)) return null;
    if (Date.now() - ts > SESSION_MAX_AGE_MS) return null;
    return { roles: ALL_ROLES.filter((r) => roles.includes(r)), ts };
  } catch { return null; }
}

// Todos los roles de la sesión (vacío si no hay sesión válida).
export function verifySessionRoles(token: string | undefined, restaurant: string): Role[] {
  return parseSession(token, restaurant)?.roles ?? [];
}

// Compatibilidad: el rol "principal" de la sesión (caja si está, si no
// cocina, si no mesero). Las rutas que devuelven `role` lo siguen usando.
export function verifySession(token: string | undefined, restaurant: string): Role | null {
  const roles = verifySessionRoles(token, restaurant);
  return roles.length > 0 ? roles[0] : null;
}

export function hasRole(roles: Role[], role: Role): boolean {
  return roles.includes(role);
}

// Firma una sesión con el rol nuevo AGREGADO a los roles que ya tenía la
// sesión actual (si la hay y es válida). Nunca reemplaza los roles
// anteriores: entrar como Meseros no cierra Cocina ni Caja.
export function signSession(restaurant: string, role: Role, existingToken?: string) {
  const current = verifySessionRoles(existingToken, restaurant);
  const roles = ALL_ROLES.filter((r) => r === role || current.includes(r));
  const payload = `${restaurant}:roles=${roles.join(",")}:${Date.now()}`;
  return Buffer.from(`${payload}:${signPayload(payload)}`).toString("base64url");
}
export const ROLE_LABEL: Record<Role, string> = { cocina: "Cocina", mesero: "Meseros", caja: "Caja" };
// Qué puede ver cada rol (también se aplica en cada API route):
export const ROLE_ACCESS: Record<Role, string[]> = {
  cocina: ["/dzib/cocina"],
  mesero: ["/dzib/meseros"],
  caja: ["/dzib/cocina", "/dzib/meseros", "/dzib/caja"],
};
