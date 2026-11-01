import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { ensureSchema } from "@/lib/server/db";
import { paystackOutcome, settlePayment } from "@/lib/server/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Paystack webhook (Dashboard → Settings → API Keys & Webhooks →
 * `<site>/api/payments/webhook/paystack`). Credits the wallet even if the
 * payer closed the tab before being redirected back.
 *
 * Authenticity: `x-paystack-signature` is an HMAC-SHA512 of the raw body
 * keyed with our secret key, so a valid signature proves Paystack sent it.
 */
export async function POST(request: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new NextResponse(null, { status: 503 });

  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const expected = createHmac("sha512", secret).update(raw).digest("hex");
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return new NextResponse(null, { status: 401 });
  }

  let event: { event?: unknown; data?: unknown };
  try {
    event = JSON.parse(raw);
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  // Acknowledge everything else so Paystack doesn't keep retrying.
  if (event.event !== "charge.success") return new NextResponse(null, { status: 200 });

  try {
    await ensureSchema();
    const result = await settlePayment("paystack", paystackOutcome(event.data));
    if (result === "not_found") console.warn("[payments:paystack-webhook] unknown reference");
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("[payments:paystack-webhook]", error instanceof Error ? error.message : "UnknownError");
    // 5xx makes Paystack retry later.
    return new NextResponse(null, { status: 500 });
  }
}
