import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { verifySession } from "@/lib/auth";
import { db } from "@/lib/store";
import { hasPostgres, getKitchenItems } from "@/lib/pg";

export async function GET(req: Request) {
  const role = verifySession(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "dzib");
  if (role !== "cocina" && role !== "caja")
    return NextResponse.json({ error: "Tu rol no tiene acceso a Cocina" }, { status: 403 });
  const kitchen = new URL(req.url).searchParams.get("kitchen") ?? "cocina-a";
  if (hasPostgres) {
    const items = await getKitchenItems(kitchen);
    return NextResponse.json({ role, kitchen, items });
  }
  const items = db.accounts.flatMap((a) => a.items.filter((i) => i.status !== "espera" && i.status !== "cancelado" && (i.kitchen === kitchen || i.kitchen === "ambas")).map((i) => ({ ...i, table: a.tableLabel, accountId: a.id })));
  return NextResponse.json({ role, kitchen, items });
}
