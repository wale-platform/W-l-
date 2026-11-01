import { getSql } from "./db";

/**
 * Platform activity, shown to admins at /admin/activity. Logging never
 * throws: a failed audit entry must not fail the action being recorded.
 */
export type ActivityAction =
  | "user.signed_up"
  | "user.logged_in"
  | "user.password_reset"
  | "user.password_changed"
  | "user.role_changed"
  | "user.suspended"
  | "user.unsuspended"
  | "user.deleted"
  | "listing.created"
  | "listing.verified"
  | "listing.unverified"
  | "listing.deleted"
  | "inspection.requested"
  | "inspection.updated"
  | "payment.started"
  | "payment.succeeded"
  | "payment.failed"
  | "purchase.paid"
  | "payout.requested"
  | "payout.paid"
  | "payout.rejected"
  | "contact.message";

export async function logActivity(
  actorId: string | null,
  action: ActivityAction,
  summary: string,
  target?: { type: string; id: string },
): Promise<void> {
  try {
    await getSql()`
      INSERT INTO activity_log (actor_id, action, summary, target_type, target_id)
      VALUES (${actorId}, ${action}, ${summary.slice(0, 500)}, ${target?.type ?? null}, ${target?.id ?? null})
    `;
  } catch (error) {
    console.error("[activity] Failed to log", action, error instanceof Error ? error.name : "UnknownError");
  }
}
