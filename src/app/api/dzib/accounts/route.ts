import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { db } from "@/lib/store";
export async function GET(req: Request) {
  const role = verifySession(req.headers.get("cookie")?.match(/comanda_staff=([^;]+)/)?.[1], "dzib");
  if (role !== "mesero" && role !== "caja")
    return NextResponse.json({ error: "Tu rol no tiene acceso a Meseros / cuentas" }, { status: 403 });
  return NextResponse.json({ role, accounts: db.accounts });
}
