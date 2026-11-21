// Roles y PINs (4-8 dígitos, uno por rol, todos distintos, sin PIN por defecto).
// El PIN nunca se guarda en claro: se guarda SHA-256(pin + sal).
// La sesión del personal es una cookie httpOnly firmada con STAFF_SESSION_SECRET.
// El control es EN EL SERVIDOR (API routes): el cliente solo esconde botones.
import { createHash, createHmac } from "crypto";
export type Role = "cocina" | "mesero" | "caja";
const SALT = "comanda-staff-salt-v1";
export function hashPin(pin: string) {
  return createHash("sha256").update(`${SALT}:${pin}`).digest("hex");
}
export function isValidPinFormat(pin: string) { return /^\d{4,8}$/.test(pin); }
export function signSession(restaurant: string, role: Role) {
  const secret = process.env.STAFF_SESSION_SECRET || "dev-only-change-me";
  const payload = `${restaurant}:${role}:${Date.now()}`;
  const sig = createHmac("sha256", secret).update(payload).digest("hex").slice(0, 32);
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}
export function verifySession(token: string | undefined, restaurant: string): Role | null {
  if (!token) return null;
  try {
    const decoded = Buffer.from(token, "base64url").toString("utf8");
    const [rest, role, ts, sig] = decoded.split(":");
    if (rest !== restaurant || !["cocina", "mesero", "caja"].includes(role)) return null;
    if (Date.now() - Number(ts) > 12 * 60 * 60 * 1000) return null; // 12 h
    const secret = process.env.STAFF_SESSION_SECRET || "dev-only-change-me";
    const expected = createHmac("sha256", secret).update(`${rest}:${role}:${ts}`).digest("hex").slice(0, 32);
    return sig === expected ? (role as Role) : null;
  } catch { return null; }
}
export const ROLE_LABEL: Record<Role, string> = { cocina: "Cocina", mesero: "Meseros", caja: "Caja" };
// Qué puede ver cada rol (también se aplica en cada API route):
export const ROLE_ACCESS: Record<Role, string[]> = {
  cocina: ["/dzib/cocina"],
  mesero: ["/dzib/meseros"],
  caja: ["/dzib/cocina", "/dzib/meseros", "/dzib/caja"],
};
