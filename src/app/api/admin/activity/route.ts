import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/server/db";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

/**
 * Activity log, newest first. `?category=user|listing|inspection|payment|payout|contact`,
 * `?q=` searches the summary, `?before=<id>` loads the next page.
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const params = request.nextUrl.searchParams;
  const category = ["user", "listing", "inspection", "payment", "payout", "contact"].includes(params.get("category") ?? "")
    ? params.get("category")
    : null;
  const q = (params.get("q") ?? "").trim().toLowerCase().slice(0, 100);
  const before = /^\d{1,18}$/.test(params.get("before") ?? "") ? params.get("before") : null;

  try {
    const rows = await getSql()`
      SELECT a.id, a.action, a.summary, a.target_type, a.target_id, a.created_at,
             u.id AS actor_id, u.full_name AS actor_name, u.role AS actor_role
      FROM activity_log a LEFT JOIN users u ON u.id = a.actor_id
      WHERE (${category}::text IS NULL OR a.action LIKE ${`${category}.%`}
             OR (${category} = 'payment' AND a.action LIKE 'purchase.%'))
        AND (${q} = '' OR LOWER(a.summary) LIKE ${`%${q}%`})
        AND (${before}::bigint IS NULL OR a.id < ${before}::bigint)
      ORDER BY a.id DESC
      LIMIT ${PAGE_SIZE + 1}
    `;
    const page = rows.slice(0, PAGE_SIZE);
    return jsonResponse({
      entries: page.map((row) => ({
        id: String(row.id),
        action: row.action,
        summary: row.summary,
        target: row.target_type ? { type: row.target_type, id: row.target_id } : null,
        actor: row.actor_id ? { id: row.actor_id, name: row.actor_name, role: row.actor_role } : null,
        createdAt: new Date(row.created_at).toISOString(),
      })),
      nextCursor: rows.length > PAGE_SIZE ? String(page[page.length - 1].id) : null,
    });
  } catch (error) {
    return serverErrorResponse("admin:activity", error);
  }
}
