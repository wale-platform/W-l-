import { NextResponse } from "next/server";
import { changePasswordSchema } from "@/lib/api/schemas";
import { getSql } from "@/lib/server/db";
import { hashPassword, verifyPassword } from "@/lib/server/password";
import { logActivity } from "@/lib/server/activity";
import {
  createSession,
  deleteAllSessions,
  getUserRow,
  jsonResponse,
  readJsonBody,
  requireUser,
  serverErrorResponse,
  toAuthUser,
  type UserRow,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Change (or, for Google-only accounts, set) the signed-in user's password.
 * Every other session is signed out afterwards.
 */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const parsed = changePasswordSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonResponse({ message: first.message, field: String(first.path[0] ?? "") }, 422);
  }

  try {
    const user = await getUserRow(auth.id);
    if (!user) return jsonResponse({ message: "Please log in to continue." }, 401);

    if (user.password_hash) {
      const current = parsed.data.currentPassword ?? "";
      if (!current || !(await verifyPassword(current, user.password_hash))) {
        return jsonResponse(
          { message: "Your current password is incorrect.", field: "currentPassword" },
          400,
        );
      }
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const rows = (await getSql()`
      UPDATE users SET password_hash = ${passwordHash} WHERE id = ${user.id} RETURNING *
    `) as UserRow[];

    await deleteAllSessions(user.id);
    await createSession(user.id);
    await logActivity(user.id, "user.password_changed", `${user.full_name} ${user.password_hash ? "changed" : "set"} their password`, { type: "user", id: user.id });
    return jsonResponse({
      message: user.password_hash ? "Your password has been changed." : "Your password has been set.",
      user: toAuthUser(rows[0]),
    });
  } catch (error) {
    return serverErrorResponse("auth:change-password", error);
  }
}
