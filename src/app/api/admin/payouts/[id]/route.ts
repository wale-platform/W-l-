import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/server/db";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import { formatKobo } from "@/lib/server/payments";
import { jsonResponse, readJsonBody, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Process a pending withdrawal:
 * - `{ action: "paid", reference: "…" }` after sending the bank transfer;
 * - `{ action: "reject", note: "…" }` refunds the held amount to the wallet.
 * Both only act on a still-pending payout, so it can't be paid twice or
 * refunded after being paid.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonBody(request);
  const get = (key: string) =>
    typeof body === "object" && body !== null && key in body ? (body as Record<string, unknown>)[key] : undefined;
  const action = get("action");
  const reference = typeof get("reference") === "string" ? String(get("reference")).trim().slice(0, 120) : "";
  const note = typeof get("note") === "string" ? String(get("note")).trim().slice(0, 500) : "";

  if (action !== "paid" && action !== "reject") return jsonResponse({ message: "Choose to mark as paid or reject." }, 422);
  if (action === "paid" && !reference) {
    return jsonResponse({ message: "Enter the bank transfer reference.", field: "reference" }, 422);
  }
  if (action === "reject" && !note) {
    return jsonResponse({ message: "Tell the user why the withdrawal was rejected.", field: "note" }, 422);
  }

  const { id } = await params;
  try {
    const sql = getSql();
    const rows = (action === "paid"
      ? await sql`
          UPDATE payouts
          SET status = 'paid', transfer_reference = ${reference}, admin_note = ${note || null},
              processed_by = ${auth.id}, processed_at = NOW()
          WHERE id = ${id} AND status = 'pending'
          RETURNING user_id, amount_kobo, bank_name, account_number
        `
      : await sql`
          WITH rejected AS (
            UPDATE payouts
            SET status = 'rejected', admin_note = ${note}, processed_by = ${auth.id}, processed_at = NOW()
            WHERE id = ${id} AND status = 'pending'
            RETURNING user_id, amount_kobo, bank_name, account_number
          ),
          refunded AS (
            UPDATE users u SET wallet_balance_kobo = u.wallet_balance_kobo + rejected.amount_kobo
            FROM rejected WHERE u.id = rejected.user_id
            RETURNING u.id
          )
          SELECT rejected.* FROM rejected
        `) as { user_id: string; amount_kobo: string | number; bank_name: string; account_number: string }[];

    if (!rows[0]) return jsonResponse({ message: "This withdrawal has already been processed." }, 409);

    const payout = rows[0];
    const summary = `${formatKobo(Number(payout.amount_kobo))} to ${payout.bank_name} ••${payout.account_number.slice(-4)}`;
    if (action === "paid") {
      await logActivity(auth.id, "payout.paid", `${auth.fullName} paid out ${summary} (ref ${reference})`, { type: "payout", id });
      await notify(payout.user_id, {
        title: "Withdrawal paid",
        body: `Your withdrawal of ${summary} has been sent. Transfer reference: ${reference}.`,
        link: "/wallet",
      });
    } else {
      await logActivity(auth.id, "payout.rejected", `${auth.fullName} rejected a withdrawal of ${summary}: ${note}`, { type: "payout", id });
      await notify(payout.user_id, {
        title: "Withdrawal declined",
        body: `Your withdrawal of ${summary} was declined and the amount is back in your wallet. Reason: ${note}`,
        link: "/wallet",
      });
    }
    return jsonResponse({ success: true });
  } catch (error) {
    return serverErrorResponse("admin:payouts:update", error);
  }
}
