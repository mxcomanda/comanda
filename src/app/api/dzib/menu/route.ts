import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { db } from "@/lib/store";
import { hasPostgres, getMenuFromDb } from "@/lib/pg";

export async function GET() {
  if (hasPostgres) {
    const menu = await getMenuFromDb();
    return NextResponse.json({ restaurant: "dzib", demo: false, ...menu });
  }
  return NextResponse.json({
    restaurant: "dzib", demo: true,
    breakfast: db.breakfast, dailyMenu: db.dailyMenu, tables: db.tables, settings: db.settings,
  });
}
