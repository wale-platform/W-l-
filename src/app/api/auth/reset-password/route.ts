import { resetPasswordSchema } from "@/lib/api/schemas";
import { consumeToken } from "@/lib/server/auth-tokens";
import { ensureSchema, getSql } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import { logActivity } from "@/lib/server/activity";
import {
  createSession,
  deleteAllSessions,
  jsonResponse,
  readJsonBody,
  serverErrorResponse,
  toAuthUser,
  type UserRow,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = resetPasswordSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonResponse({ message: first.message, field: String(first.path[0] ?? "") }, 422);
  }

  try {
    await ensureSchema();
    const userId = await consumeToken(parsed.data.token, "password_reset");
    if (!userId) {
      return jsonResponse(
        { message: "This reset link is invalid or has expired. Request a new one." },
        400,
      );
    }

    // Following the emailed link also proves the user owns the address.
    const passwordHash = await hashPassword(parsed.data.password);
    const rows = (await getSql()`
      UPDATE users
      SET password_hash = ${passwordHash}, email_verified_at = COALESCE(email_verified_at, NOW())
      WHERE id = ${userId}
      RETURNING *
    `) as UserRow[];
    if (!rows[0]) return jsonResponse({ message: "This account no longer exists." }, 404);

    // Sign out every other device in case the old password was compromised.
    await deleteAllSessions(userId);
    await createSession(userId);
    await logActivity(userId, "user.password_reset", `${rows[0].full_name} reset their password`, { type: "user", id: userId });
    return jsonResponse({ message: "Your password has been reset.", user: toAuthUser(rows[0]) });
  } catch (error) {
    return serverErrorResponse("auth:reset-password", error);
  }
}
