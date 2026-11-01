import { NextResponse } from "next/server";
import { getSql } from "@/lib/server/db";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Headline numbers for the admin dashboard. Money is in kobo. */
export async function GET() {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  try {
    const sql = getSql();
    const [users, listings, inspections, payments, payouts, activity] = await Promise.all([
      sql`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE role = 'student')::int AS students,
          COUNT(*) FILTER (WHERE role = 'landlord')::int AS landlords,
          COUNT(*) FILTER (WHERE role = 'lawyer')::int AS lawyers,
          COUNT(*) FILTER (WHERE role = 'tenant')::int AS tenants,
          COUNT(*) FILTER (WHERE role = 'admin')::int AS admins,
          COUNT(*) FILTER (WHERE suspended_at IS NOT NULL)::int AS suspended,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int AS new_this_week,
          COALESCE(SUM(wallet_balance_kobo), 0)::bigint AS wallet_total_kobo
        FROM users
      `,
      sql`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE NOT verified)::int AS pending,
               COUNT(*) FILTER (WHERE verified)::int AS verified
        FROM properties
      `,
      sql`
        SELECT COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
               COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
               COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
        FROM inspections
      `,
      sql`
        SELECT COUNT(*) FILTER (WHERE status = 'success')::int AS successful,
               COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
               COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
               COALESCE(SUM(amount_kobo) FILTER (WHERE status = 'success'), 0)::bigint AS collected_kobo,
               COALESCE(SUM(amount_kobo) FILTER (WHERE status = 'success' AND paid_at > NOW() - INTERVAL '30 days'), 0)::bigint AS collected_30d_kobo
        FROM payments
      `,
      sql`
        SELECT COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
               COALESCE(SUM(amount_kobo) FILTER (WHERE status = 'pending'), 0)::bigint AS pending_kobo,
               COALESCE(SUM(amount_kobo) FILTER (WHERE status = 'paid'), 0)::bigint AS paid_kobo
        FROM payouts
      `,
      sql`
        SELECT a.id, a.action, a.summary, a.created_at, u.full_name AS actor_name
        FROM activity_log a LEFT JOIN users u ON u.id = a.actor_id
        ORDER BY a.created_at DESC
        LIMIT 8
      `,
    ]);

    const num = (value: unknown) => Number(value ?? 0);
    const u = users[0];
    const p = payments[0];
    const po = payouts[0];

    return jsonResponse({
      users: {
        total: u.total,
        byRole: { student: u.students, landlord: u.landlords, lawyer: u.lawyers, tenant: u.tenants, admin: u.admins },
        suspended: u.suspended,
        newThisWeek: u.new_this_week,
      },
      listings: listings[0],
      inspections: inspections[0],
      payments: {
        successful: p.successful,
        pending: p.pending,
        failed: p.failed,
        collectedKobo: num(p.collected_kobo),
        collected30dKobo: num(p.collected_30d_kobo),
      },
      wallets: { totalBalanceKobo: num(u.wallet_total_kobo) },
      payouts: { pending: po.pending, pendingKobo: num(po.pending_kobo), paidKobo: num(po.paid_kobo) },
      recentActivity: activity.map((row) => ({
        id: String(row.id),
        action: row.action,
        summary: row.summary,
        actorName: row.actor_name ?? null,
        createdAt: new Date(row.created_at).toISOString(),
      })),
    });
  } catch (error) {
    return serverErrorResponse("admin:overview", error);
  }
}
