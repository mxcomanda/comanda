import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { verifySession } from "@/lib/auth";
import { db } from "@/lib/store";
import { hasPostgres, getAllAccounts } from "@/lib/pg";

export async function GET(req: Request) {
  const role = verifySession(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "dzib");
  if (role !== "mesero" && role !== "caja")
    return NextResponse.json({ error: "Tu rol no tiene acceso a Meseros / cuentas" }, { status: 403 });
  if (hasPostgres) {
    const accounts = await getAllAccounts();
    return NextResponse.json({ role, accounts });
  }
  return NextResponse.json({ role, accounts: db.accounts });
}
