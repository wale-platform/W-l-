import { NextResponse, type NextRequest } from "next/server";
import { ensureSchema } from "@/lib/server/db";
import { paymentReturnPath, settlePayment, verifyPaystack, walletStatus, type SettleResult } from "@/lib/server/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paystack sends the payer back here (`callback_url`) with `?reference=`.
 * The query string proves nothing, so the payment is verified with
 * Paystack's API before anything is credited.
 */
export async function GET(request: NextRequest) {
  const reference = request.nextUrl.searchParams.get("reference") ?? request.nextUrl.searchParams.get("trxref");
  let result: SettleResult | "error" = "not_found";

  if (reference && /^wale_[a-f0-9]{24}$/.test(reference)) {
    try {
      await ensureSchema();
      const outcome = await verifyPaystack(reference);
      result = outcome.reference === reference ? await settlePayment("paystack", outcome) : "not_found";
    } catch (error) {
      console.error("[payments:paystack-callback]", error instanceof Error ? error.message : "UnknownError");
      result = "error";
    }
  }

  const status = walletStatus(result);
  const path = reference ? await paymentReturnPath(reference, status) : `/wallet?payment=${status}`;
  return NextResponse.redirect(new URL(path, request.url));
}
