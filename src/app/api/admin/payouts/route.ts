import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/server/db";
import { toPayout, type PayoutRow } from "@/lib/server/payouts";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All withdrawal requests, pending first: `?status=pending|paid|rejected`. */
export async function GET(request: NextRequest) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const status = request.nextUrl.searchParams.get("status");
  const filter = ["pending", "paid", "rejected"].includes(status ?? "") ? status : null;

  try {
    const rows = (await getSql()`
      SELECT p.*, u.full_name AS user_name, u.email AS user_email
      FROM payouts p JOIN users u ON u.id = p.user_id
      WHERE (${filter}::text IS NULL OR p.status = ${filter})
      ORDER BY (p.status = 'pending') DESC, p.created_at DESC
      LIMIT 500
    `) as PayoutRow[];
    return jsonResponse(rows.map((row) => toPayout(row, true)));
  } catch (error) {
    return serverErrorResponse("admin:payouts", error);
  }
}
