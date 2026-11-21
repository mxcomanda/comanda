import { NextResponse } from "next/server";
import { db } from "@/lib/store";
export async function GET() {
  return NextResponse.json({
    restaurant: "dzib", demo: !process.env.POSTGRES_URL,
    breakfast: db.breakfast, dailyMenu: db.dailyMenu, tables: db.tables, settings: db.settings,
  });
}
