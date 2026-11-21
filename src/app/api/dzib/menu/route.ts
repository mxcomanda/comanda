import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/store";
import { hasPostgres, getMenuFromDb } from "@/lib/pg";

export async function GET() {
  if (hasPostgres) {
    try {
      const menu = await getMenuFromDb();
      return NextResponse.json({ restaurant: "dzib", demo: false, ...menu });
    } catch {
      return NextResponse.json({ error: "No se pudo leer el menú de la base de datos" }, { status: 500 });
    }
  }
  return NextResponse.json({
    restaurant: "dzib", demo: true,
    breakfast: db.breakfast, dailyMenu: db.dailyMenu, tables: db.tables, settings: db.settings,
  });
}
