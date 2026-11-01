import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/server/db";
import { settlePayment, verifyFlutterwaveById } from "@/lib/server/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Flutterwave webhook (Dashboard → Settings → Webhooks →
 * `<site>/api/payments/webhook/flutterwave`, with a "Secret hash" equal to
 * FLUTTERWAVE_WEBHOOK_HASH).
 *
 * The `verif-hash` header is a shared secret rather than a signature of the
 * body, so the event is only used as a prompt: the transaction is always
 * re-verified with Flutterwave's API before anything is credited.
 */
export async function POST(request: Request) {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH;
  if (!expected || !process.env.FLUTTERWAVE_SECRET_KEY) return new NextResponse(null, { status: 503 });

  const received = request.headers.get("verif-hash") ?? "";
  if (
    received.length !== expected.length ||
    !timingSafeEqual(Buffer.from(received), Buffer.from(expected))
  ) {
    return new NextResponse(null, { status: 401 });
  }

  let event: { event?: unknown; data?: { id?: unknown; tx_ref?: unknown } };
  try {
    event = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  const transactionId = event.data?.id != null ? String(event.data.id) : "";
  const reference = typeof event.data?.tx_ref === "string" ? event.data.tx_ref : "";
  // Only our wallet top-ups, and only completed charges.
  if (event.event !== "charge.completed" || !/^\d{1,20}$/.test(transactionId) || !reference.startsWith("wale_")) {
    return new NextResponse(null, { status: 200 });
  }

  try {
    await ensureSchema();
    const outcome = await verifyFlutterwaveById(transactionId);
    if (outcome.reference !== reference) return new NextResponse(null, { status: 200 });
    await settlePayment("flutterwave", outcome);
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[payments:flutterwave-webhook]", error instanceof Error ? error.message : "UnknownError");
    return new NextResponse(null, { status: 500 });
  }
}
