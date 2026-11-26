import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { COCUYOS_CATEGORIES, COCUYOS_MENU, COCUYOS_META, COCUYOS_PENDING_PRICE, COCUYOS_TABLES } from "@/data/cocuyos";

// El menú de Cocuyos vive en el archivo de datos, no en la base: se
// sirve tal cual (237 ítems, 16 categorías, bilingüe).
export async function GET() {
  return NextResponse.json({
    restaurant: "cocuyos",
    meta: COCUYOS_META,
    categories: COCUYOS_CATEGORIES,
    items: COCUYOS_MENU,
    itemCount: COCUYOS_MENU.length,
    pendingPrice: COCUYOS_PENDING_PRICE,
    tables: COCUYOS_TABLES,
  });
}
