import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/store";
import { hasPostgres, getMenuFromDb } from "@/lib/pg";
import { sql } from "@/lib/db";

export async function GET() {
  if (hasPostgres) {
    try {
      const menu = await getMenuFromDb();
      return NextResponse.json({ restaurant: "dzib", demo: false, ...menu });
    } catch (e) {
      // Temporal: diagnóstico del 500 en producción.
      let diag: Record<string, unknown> = {};
      try {
        const c = await sql`SELECT COUNT(*) AS n, MAX(id) AS max_id FROM menu_items`;
        const s = await sql`SELECT last_value, is_called FROM menu_items_id_seq`;
        const cats = await sql`SELECT category, COUNT(*) AS n FROM menu_items GROUP BY category`;
        diag = { count: c.rows[0], seq: s.rows[0], byCategory: cats.rows };
      } catch (e2) {
        diag = { diagError: String((e2 as Error)?.message ?? e2) };
      }
      return NextResponse.json({ error: "menu_db_error", detail: String((e as Error)?.message ?? e), diag }, { status: 500 });
    }
  }
  return NextResponse.json({
    restaurant: "dzib", demo: true,
    breakfast: db.breakfast, dailyMenu: db.dailyMenu, tables: db.tables, settings: db.settings,
  });
}
