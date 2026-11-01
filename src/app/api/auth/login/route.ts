import { loginSchema } from "@/lib/api/schemas";
import { ensureSchema, getSql } from "@/lib/server/db";
import { getDummyHash, verifyPassword } from "@/lib/server/password";
import { logActivity } from "@/lib/server/activity";
import {
  createSession,
  jsonResponse,
  serverErrorResponse,
  toAuthUser,
  type UserRow,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const INVALID_CREDENTIALS = "Invalid email or password.";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Invalid login request." }, 400);
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ message: INVALID_CREDENTIALS }, 401);
  }

  try {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT * FROM users WHERE email = ${parsed.data.email.trim().toLowerCase()} LIMIT 1
    `) as UserRow[];
    const user = rows[0];

    if (!user) {
      // Spend the same time as a real check so response timing doesn't
      // reveal which emails have accounts.
      await verifyPassword(parsed.data.password, await getDummyHash());
      return jsonResponse({ message: INVALID_CREDENTIALS }, 401);
    }

    if (!user.password_hash) {
      return jsonResponse(
        { message: "This account uses Google sign-in. Continue with Google to log in." },
        401,
      );
    }

    if (!(await verifyPassword(parsed.data.password, user.password_hash))) {
      return jsonResponse({ message: INVALID_CREDENTIALS }, 401);
    }

    // Checked after the password so suspension isn't revealed to guessers.
    if (user.suspended_at) {
      return jsonResponse(
        { message: "This account has been suspended. Contact WALE support if you think this is a mistake." },
        403,
      );
    }

    await createSession(user.id, { remember: parsed.data.remember ?? true });
    await logActivity(user.id, "user.logged_in", `${user.full_name} logged in with email`, { type: "user", id: user.id });
    return jsonResponse({ message: "Welcome back!", user: toAuthUser(user) });
  } catch (error) {
    return serverErrorResponse("auth:login", error);
  }
}
