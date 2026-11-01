import { NextResponse } from "next/server";
import { getSql } from "@/lib/server/db";
import { configuredProviders } from "@/lib/server/payments";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Balance, recent top-ups, and which payment gateways are available. */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const sql = getSql();
    const [balanceResult, paymentResult] = await Promise.all([
      sql`SELECT wallet_balance_kobo FROM users WHERE id = ${auth.id}`,
      sql`
        SELECT reference, provider, amount_kobo, status, created_at, paid_at FROM payments
        WHERE user_id = ${auth.id}
        ORDER BY created_at DESC
        LIMIT 20
      `,
    ]);
    const balance = balanceResult as { wallet_balance_kobo: string | number }[];
    const payments = paymentResult as {
      reference: string;
      provider: "paystack" | "flutterwave";
      amount_kobo: string | number;
      status: "pending" | "success" | "failed";
      created_at: string | Date;
      paid_at: string | Date | null;
    }[];

    return jsonResponse({
      // BIGINT arrives as a string; balances fit comfortably in a JS number.
      balanceKobo: Number(balance[0]?.wallet_balance_kobo ?? 0),
      payments: payments.map((payment) => ({
        reference: payment.reference,
        provider: payment.provider,
        amountKobo: Number(payment.amount_kobo),
        status: payment.status,
        createdAt: new Date(payment.created_at).toISOString(),
        paidAt: payment.paid_at ? new Date(payment.paid_at).toISOString() : null,
      })),
      providers: configuredProviders(),
    });
  } catch (error) {
    return serverErrorResponse("wallet", error);
  }
}
