import { NextResponse } from "next/server";
import { getSql } from "@/lib/server/db";
import {
  jsonResponse,
  readJsonBody,
  requireUser,
  serverErrorResponse,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface NotificationRow {
  id: string | number;
  title: string;
  body: string;
  link: string | null;
  read_at: string | Date | null;
  created_at: string | Date;
}

/** The signed-in user's 50 most recent notifications and unread count. */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  try {
    const sql = getSql();
    const [rowResult, unreadResult] = await Promise.all([
      sql`
        SELECT id, title, body, link, read_at, created_at FROM notifications
        WHERE user_id = ${auth.id}
        ORDER BY created_at DESC
        LIMIT 50
      `,
      sql`
        SELECT COUNT(*)::int AS count FROM notifications
        WHERE user_id = ${auth.id} AND read_at IS NULL
      `,
    ]);
    const rows = rowResult as NotificationRow[];
    const unread = unreadResult as { count: number }[];

    return jsonResponse({
      unreadCount: unread[0].count,
      notifications: rows.map((row) => ({
        id: String(row.id),
        title: row.title,
        body: row.body,
        link: row.link,
        read: row.read_at !== null,
        createdAt: new Date(row.created_at).toISOString(),
      })),
    });
  } catch (error) {
    return serverErrorResponse("notifications:list", error);
  }
}

/** Mark notifications read: `{ "all": true }` or `{ "ids": ["1", "2"] }`. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonBody(request);
  const all = typeof body === "object" && body !== null && "all" in body && body.all === true;
  const ids =
    typeof body === "object" && body !== null && "ids" in body && Array.isArray(body.ids)
      ? body.ids.filter((id): id is string => typeof id === "string" && /^\d{1,18}$/.test(id)).slice(0, 100)
      : [];
  if (!all && ids.length === 0) {
    return jsonResponse({ message: "Say which notifications to mark as read." }, 422);
  }

  try {
    const sql = getSql();
    if (all) {
      await sql`UPDATE notifications SET read_at = NOW() WHERE user_id = ${auth.id} AND read_at IS NULL`;
    } else {
      await sql`
        UPDATE notifications SET read_at = NOW()
        WHERE user_id = ${auth.id} AND read_at IS NULL AND id = ANY(${ids}::bigint[])
      `;
    }
    return jsonResponse({ success: true });
  } catch (error) {
    return serverErrorResponse("notifications:read", error);
  }
}
