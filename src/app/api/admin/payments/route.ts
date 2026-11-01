import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/server/db";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All wallet top-ups: `?status=`, `?provider=`, `?q=` (reference, name or email). */
export async function GET(request: NextRequest) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const params = request.nextUrl.searchParams;
  const status = ["pending", "success", "failed"].includes(params.get("status") ?? "") ? params.get("status") : null;
  const provider = ["paystack", "flutterwave"].includes(params.get("provider") ?? "") ? params.get("provider") : null;
  const q = (params.get("q") ?? "").trim().toLowerCase().slice(0, 100);

  try {
    const rows = await getSql()`
      SELECT p.reference, p.provider, p.amount_kobo, p.status, p.provider_transaction_id, p.created_at, p.paid_at,
             p.purpose, pu.item_label, pu.plan,
             u.id AS user_id, u.full_name, u.email
      FROM payments p JOIN users u ON u.id = p.user_id
      LEFT JOIN purchases pu ON pu.id = p.purchase_id
      WHERE (${status}::text IS NULL OR p.status = ${status})
        AND (${provider}::text IS NULL OR p.provider = ${provider})
        AND (${q} = '' OR LOWER(p.reference) LIKE ${`%${q}%`} OR LOWER(u.full_name) LIKE ${`%${q}%`} OR LOWER(u.email) LIKE ${`%${q}%`})
      ORDER BY p.created_at DESC
      LIMIT 500
    `;
    return jsonResponse(
      rows.map((row) => ({
        reference: row.reference,
        provider: row.provider,
        amountKobo: Number(row.amount_kobo),
        status: row.status,
        transactionId: row.provider_transaction_id,
        purpose: row.purpose === "purchase" ? `Boost: ${row.item_label ?? "listing"}` : "Wallet top-up",
        createdAt: new Date(row.created_at).toISOString(),
        paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,
        user: { id: row.user_id, name: row.full_name, email: row.email },
      })),
    );
  } catch (error) {
    return serverErrorResponse("admin:payments", error);
  }
}
