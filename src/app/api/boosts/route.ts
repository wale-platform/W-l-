import { NextResponse } from "next/server";
import { BOOST_PLANS, LISTING_ROLES, boostRequestSchema } from "@/lib/api/schemas";
import { getSql } from "@/lib/server/db";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import {
  configuredProviders,
  formatKobo,
  initializeFlutterwave,
  initializePaystack,
  newPaymentReference,
  paymentCallbackUrl,
  providerName,
} from "@/lib/server/payments";
import { getDbProperty } from "@/lib/server/properties";
import {
  jsonResponse,
  newId,
  readJsonBody,
  requireUser,
  serverErrorResponse,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Boost one of your listings: `{ propertyId, plan: "7d", method: "wallet" }`.
 *
 * - `wallet`: paid from the wallet balance and applied at once, in one
 *   statement that only succeeds if the balance covers the price.
 * - `paystack` / `flutterwave`: returns a checkout URL; the boost is
 *   applied when the gateway confirms the payment (see settlePayment).
 *
 * The price always comes from BOOST_PLANS on the server.
 */
export async function POST(request: Request) {
  const auth = await requireUser(LISTING_ROLES);
  if (auth instanceof NextResponse) return auth;

  const parsed = boostRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonResponse({ message: first.message, field: String(first.path[0] ?? "") }, 422);
  }
  const { propertyId, method } = parsed.data;
  const plan = BOOST_PLANS.find((option) => option.id === parsed.data.plan)!;
  const amountKobo = plan.price * 100;

  try {
    const listing = await getDbProperty(propertyId);
    if (!listing || listing.ownerId !== auth.id) {
      return jsonResponse({ message: "You can only boost your own listings." }, 403);
    }

    const sql = getSql();
    const purchaseId = newId("pur");
    const label = listing.title.slice(0, 200);

    if (method === "wallet") {
      const rows = (await sql`
        WITH debit AS (
          UPDATE users SET wallet_balance_kobo = wallet_balance_kobo - ${amountKobo}
          WHERE id = ${auth.id} AND wallet_balance_kobo >= ${amountKobo}
          RETURNING id
        ),
        purchase AS (
          INSERT INTO purchases (id, user_id, item_type, item_id, item_label, plan, amount_kobo, method, status, paid_at)
          SELECT ${purchaseId}, debit.id, 'listing_boost', ${propertyId}, ${label}, ${plan.id}, ${amountKobo}, 'wallet', 'paid', NOW()
          FROM debit
          RETURNING id
        ),
        boosted AS (
          UPDATE properties
          SET boosted_until = GREATEST(COALESCE(boosted_until, NOW()), NOW()) + make_interval(days => ${plan.days})
          WHERE id = ${propertyId} AND EXISTS (SELECT 1 FROM purchase)
          RETURNING boosted_until
        )
        SELECT (SELECT boosted_until FROM boosted) AS boosted_until
      `) as { boosted_until: string | Date | null }[];

      const boostedUntil = rows[0]?.boosted_until;
      if (!boostedUntil) {
        return jsonResponse(
          { message: `Your wallet balance doesn't cover ${formatKobo(amountKobo)}. Fund your wallet or pay with Paystack or Flutterwave.`, field: "method" },
          422,
        );
      }

      await logActivity(auth.id, "purchase.paid", `${auth.fullName} boosted "${label}" for ${plan.label} with wallet balance (${formatKobo(amountKobo)})`, { type: "listing", id: propertyId });
      await notify(auth.id, {
        title: "Listing boosted",
        body: `"${label}" is boosted for ${plan.label} and now appears first in search. ${formatKobo(amountKobo)} was paid from your wallet.`,
        link: "/wallet",
      });
      return jsonResponse({ status: "paid", boostedUntil: new Date(boostedUntil).toISOString() });
    }

    // Pay directly through a gateway.
    if (!configuredProviders()[method]) {
      return jsonResponse({ message: `${providerName(method)} payments aren't available yet. Try another option.` }, 503);
    }
    const reference = newPaymentReference();
    await sql`
      INSERT INTO purchases (id, user_id, item_type, item_id, item_label, plan, amount_kobo, method)
      VALUES (${purchaseId}, ${auth.id}, 'listing_boost', ${propertyId}, ${label}, ${plan.id}, ${amountKobo}, ${method})
    `;
    await sql`
      INSERT INTO payments (reference, user_id, provider, amount_kobo, purpose, purchase_id)
      VALUES (${reference}, ${auth.id}, ${method}, ${amountKobo}, 'purchase', ${purchaseId})
    `;

    try {
      const callbackUrl = paymentCallbackUrl(request, method);
      const authorizationUrl =
        method === "paystack"
          ? await initializePaystack({ reference, amountKobo, email: auth.email, userId: auth.id, callbackUrl })
          : await initializeFlutterwave({ reference, amountKobo, email: auth.email, name: auth.fullName, userId: auth.id, callbackUrl });
      await logActivity(auth.id, "payment.started", `${auth.fullName} started a ${formatKobo(amountKobo)} ${providerName(method)} payment to boost "${label}"`, { type: "payment", id: reference });
      return jsonResponse({ status: "redirect", authorizationUrl });
    } catch (error) {
      console.error("[boosts]", error instanceof Error ? error.message : "UnknownError");
      await sql`UPDATE payments SET status = 'failed' WHERE reference = ${reference}`.catch(() => undefined);
      await sql`UPDATE purchases SET status = 'failed' WHERE id = ${purchaseId}`.catch(() => undefined);
      return jsonResponse({ message: "We couldn't reach the payment provider. Please try again." }, 502);
    }
  } catch (error) {
    return serverErrorResponse("boosts", error);
  }
}
