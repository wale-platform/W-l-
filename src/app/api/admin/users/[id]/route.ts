import { NextResponse, type NextRequest } from "next/server";
import { authRoleSchema } from "@/lib/api/schemas";
import { getSql } from "@/lib/server/db";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import {
  deleteAllSessions,
  getUserRow,
  jsonResponse,
  readJsonBody,
  requireUser,
  serverErrorResponse,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Change a user's role and/or suspend them: `{ role?: "landlord", suspended?: true }`. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (id === auth.id) {
    return jsonResponse({ message: "You can't change your own role or suspend yourself." }, 422);
  }

  const body = await readJsonBody(request);
  const get = (key: string) =>
    typeof body === "object" && body !== null && key in body ? (body as Record<string, unknown>)[key] : undefined;
  const role = get("role") === undefined ? undefined : authRoleSchema.safeParse(get("role"));
  const suspended = get("suspended");
  if ((role && !role.success) || (suspended !== undefined && typeof suspended !== "boolean")) {
    return jsonResponse({ message: "Invalid change." }, 422);
  }
  if (!role && suspended === undefined) return jsonResponse({ message: "Nothing to change." }, 422);

  try {
    const user = await getUserRow(id);
    if (!user) return jsonResponse({ message: "User not found." }, 404);
    const sql = getSql();

    if (role?.success && role.data !== user.role) {
      await sql`UPDATE users SET role = ${role.data} WHERE id = ${id}`;
      await logActivity(auth.id, "user.role_changed", `${auth.fullName} changed ${user.full_name}'s role from ${user.role} to ${role.data}`, { type: "user", id });
      await notify(id, {
        title: "Your account type changed",
        body: `An administrator changed your account from ${user.role} to ${role.data}.`,
        link: "/account",
      });
    }

    if (typeof suspended === "boolean" && suspended !== Boolean(user.suspended_at)) {
      if (suspended) {
        await sql`UPDATE users SET suspended_at = NOW() WHERE id = ${id}`;
        await deleteAllSessions(id); // signed out everywhere, immediately
      } else {
        await sql`UPDATE users SET suspended_at = NULL WHERE id = ${id}`;
      }
      await logActivity(auth.id, suspended ? "user.suspended" : "user.unsuspended", `${auth.fullName} ${suspended ? "suspended" : "reactivated"} ${user.full_name}`, { type: "user", id });
    }

    return jsonResponse({ success: true });
  } catch (error) {
    return serverErrorResponse("admin:users:update", error);
  }
}

/**
 * Permanently delete an account and everything it owns (listings, payments,
 * inspections). Refused while the user has money in their wallet or a
 * pending withdrawal — suspend the account instead.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  if (id === auth.id) return jsonResponse({ message: "You can't delete your own account here." }, 422);

  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT u.full_name, u.email, u.wallet_balance_kobo,
             (SELECT COUNT(*) FROM payouts p WHERE p.user_id = u.id AND p.status = 'pending')::int AS pending_payouts
      FROM users u WHERE u.id = ${id}
    `) as { full_name: string; email: string; wallet_balance_kobo: string | number; pending_payouts: number }[];
    const user = rows[0];
    if (!user) return jsonResponse({ message: "User not found." }, 404);
    if (Number(user.wallet_balance_kobo) > 0 || user.pending_payouts > 0) {
      return jsonResponse(
        { message: "This user has wallet funds or a pending withdrawal. Settle those first, or suspend the account instead." },
        409,
      );
    }

    await sql`DELETE FROM users WHERE id = ${id}`;
    await logActivity(auth.id, "user.deleted", `${auth.fullName} deleted the account of ${user.full_name} <${user.email}>`, { type: "user", id });
    return jsonResponse({ success: true });
  } catch (error) {
    return serverErrorResponse("admin:users:delete", error);
  }
}
