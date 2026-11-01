import { signUpFormSchema } from "@/lib/api/schemas";
import { ensureSchema, getSql } from "@/lib/server/db";
import { hashPassword } from "@/lib/server/password";
import { sendVerificationEmail } from "@/lib/server/auth-tokens";
import { notify } from "@/lib/server/notifications";
import { logActivity } from "@/lib/server/activity";
import {
  createSession,
  jsonResponse,
  newId,
  serverErrorResponse,
  toAuthUser,
  type UserRow,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Invalid sign-up request." }, 400);
  }

  const parsed = signUpFormSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return jsonResponse({ message: first.message, field: String(first.path[0] ?? "") }, 422);
  }

  const { name, email, phone, role, password } = parsed.data;

  try {
    await ensureSchema();
    const passwordHash = await hashPassword(password);

    const rows = (await getSql()`
      INSERT INTO users (id, full_name, email, phone, role, password_hash)
      VALUES (${newId("usr")}, ${name}, ${email.toLowerCase()}, ${phone}, ${role}, ${passwordHash})
      ON CONFLICT (email) DO NOTHING
      RETURNING *
    `) as UserRow[];

    if (!rows[0]) {
      return jsonResponse(
        { message: "This email is already in use. Log in instead, or use a different email.", field: "email" },
        409,
      );
    }

    await createSession(rows[0].id);
    await logActivity(rows[0].id, "user.signed_up", `${rows[0].full_name} signed up as ${rows[0].role}`, { type: "user", id: rows[0].id });
    await notify(rows[0].id, {
      title: "Welcome to WALE",
      body: "Your account is ready. Fund your wallet, explore homes near your campus, and keep an eye here for updates.",
      link: "/account",
    });

    // The account works straight away; confirming the email is prompted
    // in the dashboard. A failed send shouldn't fail the sign-up.
    try {
      await sendVerificationEmail(request, rows[0]);
    } catch (error) {
      console.error("[auth:signup] Verification email failed", error instanceof Error ? error.name : "UnknownError");
    }

    return jsonResponse({ message: "Account created successfully!", user: toAuthUser(rows[0]) }, 201);
  } catch (error) {
    return serverErrorResponse("auth:signup", error);
  }
}
