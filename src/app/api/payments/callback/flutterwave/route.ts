import { NextResponse, type NextRequest } from "next/server";
import { ensureSchema, getSql } from "@/lib/server/db";
import {
  paymentReturnPath,
  settlePayment,
  verifyFlutterwaveById,
  verifyFlutterwaveByReference,
  walletStatus,
  type SettleResult,
} from "@/lib/server/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Flutterwave sends the payer back here (`redirect_url`) with
 * `?status=&tx_ref=&transaction_id=`. Those values prove nothing, so the
 * transaction is verified with Flutterwave's API before anything is
 * credited, and its tx_ref must match the reference we issued.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const reference = params.get("tx_ref");
  const transactionId = params.get("transaction_id");
  let result: SettleResult | "error" = "not_found";

  if (reference && /^wale_[a-f0-9]{24}$/.test(reference)) {
    try {
      await ensureSchema();
      if (params.get("status") === "cancelled" && !transactionId) {
        // Closed the checkout without paying: nothing to verify.
        await getSql()`
          UPDATE payments SET status = 'failed'
          WHERE reference = ${reference} AND provider = 'flutterwave' AND status = 'pending'
        `;
        result = "failed";
      } else {
        const outcome =
          transactionId && /^\d{1,20}$/.test(transactionId)
            ? await verifyFlutterwaveById(transactionId)
            : await verifyFlutterwaveByReference(reference);
        result = outcome.reference === reference ? await settlePayment("flutterwave", outcome) : "not_found";
      }
    } catch (error) {
      console.error("[payments:flutterwave-callback]", error instanceof Error ? error.message : "UnknownError");
      result = "error";
    }
  }

  const status = walletStatus(result);
  const path = reference ? await paymentReturnPath(reference, status) : `/wallet?payment=${status}`;
  return NextResponse.redirect(new URL(path, request.url));
}
