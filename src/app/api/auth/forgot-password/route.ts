import { forgotPasswordSchema } from "@/lib/api/schemas";
import { sendPasswordResetEmail } from "@/lib/server/auth-tokens";
import { ensureSchema, getSql } from "@/lib/server/db";
import {
  jsonResponse,
  readJsonBody,
  serverErrorResponse,
  type UserRow,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Always answers the same way whether or not the email has an account, so
 * this form can't be used to find out who is registered.
 */
const GENERIC_RESPONSE = {
  message: "If an account exists for that email, we've sent a link to reset the password.",
};

export async function POST(request: Request) {
  const parsed = forgotPasswordSchema.safeParse(await readJsonBody(request));
  if (!parsed.success) {
    return jsonResponse({ message: parsed.error.issues[0].message, field: "email" }, 422);
  }

  try {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT * FROM users WHERE email = ${parsed.data.email.toLowerCase()} LIMIT 1
    `) as UserRow[];

    if (rows[0]) {
      try {
        await sendPasswordResetEmail(request, rows[0]);
      } catch (error) {
        // Logged, not reported: an error here would reveal the account exists.
        console.error("[auth:forgot-password] Reset email failed", error instanceof Error ? error.name : "UnknownError");
      }
    }
    return jsonResponse(GENERIC_RESPONSE);
  } catch (error) {
    return serverErrorResponse("auth:forgot-password", error);
  }
}
