import { randomBytes } from "node:crypto";
import { BOOST_PLANS, type PaymentProvider } from "@/lib/api/schemas";
import { getSql } from "./db";
import { appBaseUrl } from "./email";
import { logActivity } from "./activity";

/**
 * Wallet top-ups through Paystack and Flutterwave, both via their hosted
 * checkout pages (redirect flow), so card details never touch WALE.
 *
 * A payment is created here as `pending` with our own `reference`, the user
 * pays on the gateway, and the payment is credited only after the gateway's
 * API (or a signed webhook) confirms it. `settlePayment` credits in a single
 * SQL statement guarded by `status = 'pending'`, so the browser redirect and
 * the webhook can both arrive and the wallet is still credited exactly once.
 *
 * Env: PAYSTACK_SECRET_KEY, FLUTTERWAVE_SECRET_KEY, FLUTTERWAVE_WEBHOOK_HASH.
 */

const PAYSTACK_API = "https://api.paystack.co";
const FLUTTERWAVE_API = "https://api.flutterwave.com/v3";
const TIMEOUT_MS = 20_000;

export class PaymentGatewayError extends Error {
  constructor(provider: PaymentProvider, detail: string) {
    super(`${provider}: ${detail}`);
    this.name = "PaymentGatewayError";
  }
}

export function configuredProviders(): Record<PaymentProvider, boolean> {
  return {
    paystack: Boolean(process.env.PAYSTACK_SECRET_KEY),
    flutterwave: Boolean(process.env.FLUTTERWAVE_SECRET_KEY),
  };
}

export function newPaymentReference(): string {
  return `wale_${randomBytes(12).toString("hex")}`;
}

export function paymentCallbackUrl(request: Request, provider: PaymentProvider): string {
  return `${appBaseUrl(request)}/api/payments/callback/${provider}`;
}

/** What a gateway says happened to a payment. */
export interface PaymentOutcome {
  status: "success" | "failed" | "pending";
  amountKobo: number;
  currency: string;
  transactionId: string | null;
  reference: string;
}

async function gatewayFetch(provider: PaymentProvider, url: string, init: RequestInit = {}): Promise<unknown> {
  const secret = provider === "paystack" ? process.env.PAYSTACK_SECRET_KEY : process.env.FLUTTERWAVE_SECRET_KEY;
  if (!secret) throw new PaymentGatewayError(provider, "secret key is not configured");

  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : `HTTP ${response.status}`;
    throw new PaymentGatewayError(provider, message);
  }
  return body;
}

function field(value: unknown, ...path: string[]): unknown {
  let current = value;
  for (const key of path) {
    if (typeof current !== "object" || current === null || !(key in current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

/* --------------------------------------------------------- Paystack -- */

export async function initializePaystack(args: {
  reference: string;
  amountKobo: number;
  email: string;
  userId: string;
  callbackUrl: string;
}): Promise<string> {
  const body = await gatewayFetch("paystack", `${PAYSTACK_API}/transaction/initialize`, {
    method: "POST",
    body: JSON.stringify({
      email: args.email,
      amount: args.amountKobo, // Paystack amounts are in kobo
      currency: "NGN",
      reference: args.reference,
      callback_url: args.callbackUrl,
      metadata: { user_id: args.userId, purpose: "wallet_top_up" },
    }),
  });
  const url = field(body, "data", "authorization_url");
  if (typeof url !== "string") throw new PaymentGatewayError("paystack", "no authorization_url in response");
  return url;
}

/** Turns a Paystack transaction object (verify response or webhook data) into an outcome. */
export function paystackOutcome(data: unknown): PaymentOutcome {
  const status = field(data, "status");
  return {
    status: status === "success" ? "success" : status === "failed" || status === "abandoned" || status === "reversed" ? "failed" : "pending",
    amountKobo: Number(field(data, "amount")) || 0,
    currency: String(field(data, "currency") ?? ""),
    transactionId: field(data, "id") != null ? String(field(data, "id")) : null,
    reference: String(field(data, "reference") ?? ""),
  };
}

export async function verifyPaystack(reference: string): Promise<PaymentOutcome> {
  const body = await gatewayFetch("paystack", `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`);
  return paystackOutcome(field(body, "data"));
}

/* ------------------------------------------------------ Flutterwave -- */

export async function initializeFlutterwave(args: {
  reference: string;
  amountKobo: number;
  email: string;
  name: string;
  userId: string;
  callbackUrl: string;
}): Promise<string> {
  const body = await gatewayFetch("flutterwave", `${FLUTTERWAVE_API}/payments`, {
    method: "POST",
    body: JSON.stringify({
      tx_ref: args.reference,
      amount: args.amountKobo / 100, // Flutterwave amounts are in naira
      currency: "NGN",
      redirect_url: args.callbackUrl,
      customer: { email: args.email, name: args.name },
      customizations: { title: "WALE wallet top-up" },
      meta: { user_id: args.userId, purpose: "wallet_top_up" },
    }),
  });
  const link = field(body, "data", "link");
  if (typeof link !== "string") throw new PaymentGatewayError("flutterwave", "no payment link in response");
  return link;
}

function flutterwaveOutcome(data: unknown): PaymentOutcome {
  const status = field(data, "status");
  return {
    status: status === "successful" ? "success" : status === "failed" || status === "cancelled" ? "failed" : "pending",
    // Naira (may have kobo decimals) → integer kobo.
    amountKobo: Math.round((Number(field(data, "amount")) || 0) * 100),
    currency: String(field(data, "currency") ?? ""),
    transactionId: field(data, "id") != null ? String(field(data, "id")) : null,
    reference: String(field(data, "tx_ref") ?? ""),
  };
}

export async function verifyFlutterwaveById(transactionId: string): Promise<PaymentOutcome> {
  const body = await gatewayFetch("flutterwave", `${FLUTTERWAVE_API}/transactions/${encodeURIComponent(transactionId)}/verify`);
  return flutterwaveOutcome(field(body, "data"));
}

export async function verifyFlutterwaveByReference(reference: string): Promise<PaymentOutcome> {
  const body = await gatewayFetch(
    "flutterwave",
    `${FLUTTERWAVE_API}/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
  );
  return flutterwaveOutcome(field(body, "data"));
}

/* ----------------------------------------------------------- Settle -- */

export type SettleResult = "credited" | "already_paid" | "failed" | "pending" | "not_found";

/** Maps a settle result to the `?payment=` status shown on the wallet page. */
export function walletStatus(result: SettleResult | "error"): "success" | "pending" | "failed" {
  if (result === "credited" || result === "already_paid") return "success";
  if (result === "pending" || result === "error") return "pending";
  return "failed";
}

export const providerName = (provider: PaymentProvider) => (provider === "paystack" ? "Paystack" : "Flutterwave");

export const formatKobo = (kobo: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN" }).format(kobo / 100);

/**
 * Applies a gateway-confirmed outcome to our payment record. Credits the
 * wallet only when the gateway says the payment succeeded in NGN for at
 * least the amount we asked for, and only once.
 */
export async function settlePayment(provider: PaymentProvider, outcome: PaymentOutcome): Promise<SettleResult> {
  const sql = getSql();
  const rows = (await sql`
    SELECT p.user_id, p.amount_kobo, p.status, p.provider, p.purpose, p.purchase_id,
           pu.plan, pu.item_id, pu.item_label
    FROM payments p LEFT JOIN purchases pu ON pu.id = p.purchase_id
    WHERE p.reference = ${outcome.reference} LIMIT 1
  `) as {
    user_id: string;
    amount_kobo: string | number;
    status: string;
    provider: string;
    purpose: "wallet_top_up" | "purchase";
    purchase_id: string | null;
    plan: string | null;
    item_id: string | null;
    item_label: string | null;
  }[];
  const payment = rows[0];
  if (!payment || payment.provider !== provider) return "not_found";
  if (payment.status !== "pending") return payment.status === "success" ? "already_paid" : "failed";

  const expectedKobo = Number(payment.amount_kobo);

  if (outcome.status === "pending") return "pending";

  const paidInFull = outcome.currency === "NGN" && outcome.amountKobo >= expectedKobo;
  if (outcome.status === "failed" || !paidInFull) {
    if (outcome.status === "success") {
      console.error(`[payments] ${provider} ${outcome.reference}: paid ${outcome.amountKobo} ${outcome.currency}, expected ${expectedKobo} NGN`);
    }
    const failed = await sql`
      WITH failed AS (
        UPDATE payments SET status = 'failed', provider_transaction_id = ${outcome.transactionId}
        WHERE reference = ${outcome.reference} AND status = 'pending'
        RETURNING purchase_id
      ),
      purchase AS (
        UPDATE purchases SET status = 'failed'
        FROM failed WHERE purchases.id = failed.purchase_id AND purchases.status = 'pending'
        RETURNING purchases.id
      )
      SELECT * FROM failed
    `;
    if (failed.length > 0) {
      await logActivity(payment.user_id, "payment.failed", `${providerName(provider)} payment of ${formatKobo(expectedKobo)} failed`, { type: "payment", id: outcome.reference });
    }
    return "failed";
  }

  if (payment.purpose === "purchase") {
    return settlePurchase(provider, outcome, payment, expectedKobo);
  }

  // One statement: mark paid, credit the wallet, and notify — all or nothing,
  // and a no-op if another request already settled this payment.
  const credited = (await sql`
    WITH paid AS (
      UPDATE payments
      SET status = 'success', paid_at = NOW(), provider_transaction_id = ${outcome.transactionId}
      WHERE reference = ${outcome.reference} AND status = 'pending'
      RETURNING user_id, amount_kobo
    ),
    wallet AS (
      UPDATE users u SET wallet_balance_kobo = u.wallet_balance_kobo + paid.amount_kobo
      FROM paid WHERE u.id = paid.user_id
      RETURNING u.id
    ),
    noted AS (
      INSERT INTO notifications (user_id, title, body, link)
      SELECT paid.user_id, 'Wallet funded',
             ${`Your wallet was credited with ${formatKobo(expectedKobo)} via ${provider === "paystack" ? "Paystack" : "Flutterwave"}.`},
             '/wallet'
      FROM paid
      RETURNING id
    )
    SELECT (SELECT COUNT(*) FROM wallet)::int AS credited
  `) as { credited: number }[];

  // No row means a concurrent request (redirect vs webhook) settled it first.
  if (!credited[0]?.credited) return "already_paid";
  await logActivity(payment.user_id, "payment.succeeded", `Wallet funded with ${formatKobo(expectedKobo)} via ${providerName(provider)}`, { type: "payment", id: outcome.reference });
  return "credited";
}

/**
 * A gateway payment for an item (a listing boost): mark the payment and the
 * purchase paid and apply the boost, in one statement guarded on 'pending'
 * so it happens exactly once. The wallet isn't touched.
 */
async function settlePurchase(
  provider: PaymentProvider,
  outcome: PaymentOutcome,
  payment: { user_id: string; plan: string | null; item_label: string | null },
  amountKobo: number,
): Promise<SettleResult> {
  const plan = BOOST_PLANS.find((option) => option.id === payment.plan);
  if (!plan) {
    console.error(`[payments] ${outcome.reference}: purchase has unknown plan ${payment.plan}`);
    return "failed";
  }

  const applied = (await getSql()`
    WITH paid AS (
      UPDATE payments
      SET status = 'success', paid_at = NOW(), provider_transaction_id = ${outcome.transactionId}
      WHERE reference = ${outcome.reference} AND status = 'pending'
      RETURNING purchase_id
    ),
    bought AS (
      UPDATE purchases SET status = 'paid', paid_at = NOW()
      FROM paid WHERE purchases.id = paid.purchase_id AND purchases.status = 'pending'
      RETURNING purchases.user_id, purchases.item_id
    ),
    boosted AS (
      UPDATE properties p
      SET boosted_until = GREATEST(COALESCE(p.boosted_until, NOW()), NOW()) + make_interval(days => ${plan.days})
      FROM bought WHERE p.id = bought.item_id
      RETURNING p.id
    ),
    noted AS (
      INSERT INTO notifications (user_id, title, body, link)
      SELECT bought.user_id, 'Listing boosted',
             ${`"${payment.item_label ?? "Your listing"}" is boosted for ${plan.label} and now appears first in search.`},
             '/notifications'
      FROM bought
      RETURNING id
    )
    SELECT (SELECT COUNT(*) FROM bought)::int AS applied
  `) as { applied: number }[];

  if (!applied[0]?.applied) return "already_paid";
  await logActivity(payment.user_id, "purchase.paid", `Boost of "${payment.item_label}" for ${plan.label} paid ${formatKobo(amountKobo)} via ${providerName(provider)}`, { type: "payment", id: outcome.reference });
  return "credited";
}

/**
 * Where to send the payer after the gateway: the wallet for top-ups, or
 * their listings page for a boost.
 */
export async function paymentReturnPath(reference: string, status: "success" | "pending" | "failed"): Promise<string> {
  const rows = (await getSql()`
    SELECT p.purpose, u.role FROM payments p JOIN users u ON u.id = p.user_id WHERE p.reference = ${reference}
  `.catch(() => [])) as { purpose: string; role: string }[];
  if (rows[0]?.purpose === "purchase") {
    const base = rows[0].role === "landlord" ? "/landlord/properties" : `/${rows[0].role}/properties`;
    return `${base}?boost=${status}`;
  }
  return `/wallet?payment=${status}`;
}
