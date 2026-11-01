import { getSql } from "./db";
import { actionEmail, appBaseUrl, sendEmail } from "./email";
import { hashToken, randomToken, type UserRow } from "./session";

/**
 * Single-use tokens for links sent by email. Only the hash is stored, each
 * token works once, and issuing a new one cancels any older unused ones.
 */

type Purpose = "password_reset" | "email_verification";

const TTL_MS: Record<Purpose, number> = {
  password_reset: 60 * 60 * 1000,
  email_verification: 48 * 60 * 60 * 1000,
};

/** Minimum gap between emails of the same kind to one account. */
const RESEND_COOLDOWN_SECONDS = 60;

async function issueToken(userId: string, purpose: Purpose): Promise<string | null> {
  const sql = getSql();
  const recent = await sql`
    SELECT 1 FROM auth_tokens
    WHERE user_id = ${userId} AND purpose = ${purpose}
      AND created_at > NOW() - make_interval(secs => ${RESEND_COOLDOWN_SECONDS})
    LIMIT 1
  `;
  if (recent.length > 0) return null;

  const token = randomToken();
  await sql`
    DELETE FROM auth_tokens
    WHERE user_id = ${userId} AND purpose = ${purpose} AND used_at IS NULL
  `;
  await sql`
    INSERT INTO auth_tokens (token_hash, user_id, purpose, expires_at)
    VALUES (${hashToken(token)}, ${userId}, ${purpose}, ${new Date(Date.now() + TTL_MS[purpose]).toISOString()})
  `;
  return token;
}

/**
 * Marks a token used and returns its user id, or `null` if the token is
 * unknown, expired, or already used. The update is atomic, so the same
 * link can't be redeemed twice by concurrent requests.
 */
export async function consumeToken(token: string, purpose: Purpose): Promise<string | null> {
  const rows = (await getSql()`
    UPDATE auth_tokens SET used_at = NOW()
    WHERE token_hash = ${hashToken(token)} AND purpose = ${purpose}
      AND used_at IS NULL AND expires_at > NOW()
    RETURNING user_id
  `) as { user_id: string }[];
  return rows[0]?.user_id ?? null;
}

/** Returns false when skipped because a link was sent in the last minute. */
export async function sendPasswordResetEmail(request: Request, user: UserRow): Promise<boolean> {
  const token = await issueToken(user.id, "password_reset");
  if (!token) return false;

  await sendEmail(
    actionEmail({
      to: user.email,
      name: user.full_name,
      subject: "Reset your WALE password",
      intro: "We received a request to reset the password for your WALE account. Use the button below to choose a new one.",
      actionLabel: "Reset password",
      actionUrl: `${appBaseUrl(request)}/reset-password?token=${token}`,
      footnote: "This link expires in 1 hour and can only be used once. If you didn't ask to reset your password, you can ignore this email — your password won't change.",
    }),
  );
  return true;
}

export async function sendVerificationEmail(request: Request, user: UserRow): Promise<boolean> {
  const token = await issueToken(user.id, "email_verification");
  if (!token) return false;

  await sendEmail(
    actionEmail({
      to: user.email,
      name: user.full_name,
      subject: "Confirm your email for WALE",
      intro: "Welcome to WALE! Please confirm this is your email address so landlords and students know they can reach you.",
      actionLabel: "Confirm email",
      actionUrl: `${appBaseUrl(request)}/verify-email?token=${token}`,
      footnote: "This link expires in 48 hours. If you didn't create a WALE account, you can ignore this email.",
    }),
  );
  return true;
}
