import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/server/db";
import {
  settlePayment,
  verifyFlutterwaveByReference,
  verifyPaystack,
} from "@/lib/server/payments";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messages = {
  credited: "Confirmed with the gateway — the wallet has been credited.",
  already_paid: "This payment was already credited.",
  failed: "The gateway reports this payment as failed or incomplete.",
  pending: "The gateway still reports this payment as pending.",
  not_found: "The gateway doesn't recognise this payment.",
} as const;

/**
 * Re-check a payment with Paystack / Flutterwave and settle it — for a
 * pending top-up whose redirect and webhook never arrived.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ reference: string }> }) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { reference } = await params;
  try {
    const rows = (await getSql()`SELECT provider FROM payments WHERE reference = ${reference}`) as {
      provider: "paystack" | "flutterwave";
    }[];
    if (!rows[0]) return jsonResponse({ message: "Payment not found." }, 404);

    const provider = rows[0].provider;
    let outcome;
    try {
      outcome = provider === "paystack" ? await verifyPaystack(reference) : await verifyFlutterwaveByReference(reference);
    } catch (error) {
      return jsonResponse(
        { message: `Couldn't reach ${provider === "paystack" ? "Paystack" : "Flutterwave"}: ${error instanceof Error ? error.message : "unknown error"}` },
        502,
      );
    }
    const result = outcome.reference === reference ? await settlePayment(provider, outcome) : "not_found";
    return jsonResponse({ result, message: messages[result] });
  } catch (error) {
    return serverErrorResponse("admin:payments:verify", error);
  }
}
