import { NextResponse } from "next/server";
import { walletTopUpSchema } from "@/lib/api/schemas";
import { getSql } from "@/lib/server/db";
import { logActivity } from "@/lib/server/activity";
import {
  configuredProviders,
  initializeFlutterwave,
  initializePaystack,
  newPaymentReference,
  paymentCallbackUrl,
} from "@/lib/server/payments";
import {
  jsonResponse,
  readJsonBody,
  requireUser,
  serverErrorResponse,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unfinished checkouts one user may start within 10 minutes. */
const PENDING_LIMIT = 10;

/**
 * Start a wallet top-up: `{ amount: 5000, provider: "paystack" }` (amount
 * in naira). Records a pending payment and returns the gateway's hosted
 * checkout URL for the browser to open.
 */
export async function POST(request: Request) {
  const auth = await requireUser(["student", "landlord", "lawyer", "tenant"]);
  if (auth instanceof NextResponse) return auth;

  const parsed = walletTopUpSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonResponse({ message: first.message, field: String(first.path[0] ?? "") }, 422);
  }
  const { amount, provider } = parsed.data;

  if (!configuredProviders()[provider]) {
    return jsonResponse(
      { message: `${provider === "paystack" ? "Paystack" : "Flutterwave"} payments aren't available yet. Try the other option.` },
      503,
    );
  }

  const reference = newPaymentReference();
  const amountKobo = amount * 100;
  const sql = getSql();

  try {
    const recent = (await sql`
      SELECT COUNT(*)::int AS count FROM payments
      WHERE user_id = ${auth.id} AND status = 'pending' AND created_at > NOW() - INTERVAL '10 minutes'
    `) as { count: number }[];
    if (recent[0].count >= PENDING_LIMIT) {
      return jsonResponse({ message: "You've started several payments recently. Please wait a few minutes." }, 429);
    }

    await sql`
      INSERT INTO payments (reference, user_id, provider, amount_kobo)
      VALUES (${reference}, ${auth.id}, ${provider}, ${amountKobo})
    `;
  } catch (error) {
    return serverErrorResponse("payments:initialize", error);
  }

  try {
    const callbackUrl = paymentCallbackUrl(request, provider);
    const authorizationUrl =
      provider === "paystack"
        ? await initializePaystack({ reference, amountKobo, email: auth.email, userId: auth.id, callbackUrl })
        : await initializeFlutterwave({
            reference,
            amountKobo,
            email: auth.email,
            name: auth.fullName,
            userId: auth.id,
            callbackUrl,
          });
    await logActivity(auth.id, "payment.started", `${auth.fullName} started a ₦${amount.toLocaleString("en-NG")} ${provider === "paystack" ? "Paystack" : "Flutterwave"} top-up`, { type: "payment", id: reference });
    return jsonResponse({ authorizationUrl, reference });
  } catch (error) {
    console.error("[payments:initialize]", error instanceof Error ? error.message : "UnknownError");
    await sql`UPDATE payments SET status = 'failed' WHERE reference = ${reference}`.catch(() => undefined);
    return jsonResponse({ message: "We couldn't reach the payment provider. Please try again." }, 502);
  }
}
