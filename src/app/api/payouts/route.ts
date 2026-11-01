import { NextResponse } from "next/server";
import { payoutRequestSchema } from "@/lib/api/schemas";
import { getSql } from "@/lib/server/db";
import { BankLookupError, findBank, resolveAccountName } from "@/lib/server/banks";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import { formatKobo } from "@/lib/server/payments";
import { toPayout, type PayoutRow } from "@/lib/server/payouts";
import {
  jsonResponse,
  newId,
  readJsonBody,
  requireUser,
  serverErrorResponse,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WALLET_ROLES = ["student", "landlord", "lawyer", "tenant"] as const;

/** My withdrawal requests, newest first. */
export async function GET() {
  const auth = await requireUser(WALLET_ROLES);
  if (auth instanceof NextResponse) return auth;
  try {
    const rows = (await getSql()`
      SELECT * FROM payouts WHERE user_id = ${auth.id} ORDER BY created_at DESC LIMIT 50
    `) as PayoutRow[];
    return jsonResponse(rows.map((row) => toPayout(row)));
  } catch (error) {
    return serverErrorResponse("payouts:list", error);
  }
}

/**
 * Request a withdrawal to a bank account. The amount leaves the wallet
 * immediately (held) in the same statement that records the request, so a
 * balance can never be withdrawn twice; a rejected request is refunded.
 */
export async function POST(request: Request) {
  const auth = await requireUser(WALLET_ROLES);
  if (auth instanceof NextResponse) return auth;

  const parsed = payoutRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonResponse({ message: first.message, field: String(first.path[0] ?? "") }, 422);
  }
  const { amount, bankCode, accountNumber } = parsed.data;

  // Never trust a name typed or sent by the browser: look it up again here.
  let bankName: string;
  let accountName: string;
  try {
    const bank = await findBank(bankCode);
    if (!bank) return jsonResponse({ message: "Choose your bank.", field: "bankCode" }, 422);
    bankName = bank.name;
    accountName = await resolveAccountName(accountNumber, bank.code);
  } catch (error) {
    const message = error instanceof BankLookupError ? error.message : "The account couldn't be checked. Try again.";
    return jsonResponse({ message, field: "accountNumber" }, error instanceof BankLookupError ? 422 : 502);
  }
  const amountKobo = amount * 100;
  const id = newId("pyt");

  try {
    const sql = getSql();
    const rows = (await sql`
      WITH held AS (
        UPDATE users SET wallet_balance_kobo = wallet_balance_kobo - ${amountKobo}
        WHERE id = ${auth.id} AND wallet_balance_kobo >= ${amountKobo}
        RETURNING id
      )
      INSERT INTO payouts (id, user_id, amount_kobo, bank_name, bank_code, account_number, account_name)
      SELECT ${id}, held.id, ${amountKobo}, ${bankName}, ${bankCode}, ${accountNumber}, ${accountName} FROM held
      RETURNING *
    `) as PayoutRow[];

    if (!rows[0]) {
      return jsonResponse({ message: "Your wallet balance is lower than that amount.", field: "amount" }, 422);
    }

    const summary = `${formatKobo(amountKobo)} to ${accountName}, ${bankName} ••${accountNumber.slice(-4)}`;
    await logActivity(auth.id, "payout.requested", `${auth.fullName} requested a withdrawal of ${summary}`, { type: "payout", id });
    await notify(auth.id, {
      title: "Withdrawal requested",
      body: `We've received your request to withdraw ${summary}. The amount is held from your wallet until it's paid.`,
      link: "/wallet",
    });
    const admins = (await sql`SELECT id FROM users WHERE role = 'admin' AND suspended_at IS NULL`) as { id: string }[];
    await Promise.all(
      admins.map((admin) =>
        notify(admin.id, { title: "New payout request", body: `${auth.fullName} requested ${summary}.`, link: "/admin/payouts" }),
      ),
    );

    return jsonResponse(toPayout(rows[0]), 201);
  } catch (error) {
    return serverErrorResponse("payouts:create", error);
  }
}
