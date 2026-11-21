// Capa de base de datos.
// Opción recomendada (más simple y barata para empezar): Vercel Postgres.
// En Vercel → Storage → Create Database → Postgres, conecta el proyecto y
// Vercel inyecta POSTGRES_URL automáticamente. Luego aplica scripts/seed.sql.
// Alternativas gratuitas equivalentes: Neon o Supabase (misma URL en POSTGRES_URL).
// Sin POSTGRES_URL, la app corre en modo demo con el store en memoria (src/lib/store.ts)
// y muestra un aviso visible: los pedidos NO persisten entre despliegues/reinicios.
import { sql } from "@vercel/postgres";
export const hasPostgres = Boolean(process.env.POSTGRES_URL);
export async function dbPing(): Promise<boolean> {
  if (!hasPostgres) return false;
  try { await sql`SELECT 1`; return true; } catch { return false; }
}
export { sql };
