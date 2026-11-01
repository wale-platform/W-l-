import { createHmac, timingSafeEqual } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import type { SignUpRole } from "@/lib/api/schemas";
import { getSql } from "./db";
import { appBaseUrl } from "./email";
import { notify } from "./notifications";
import { logActivity } from "./activity";
import { newId, type UserRow } from "./session";

/**
 * Google sign-in with the OAuth 2.0 authorization-code flow (PKCE + state +
 * nonce). The browser is sent to Google, Google redirects back to
 * `/api/auth/callback/google` with a one-time code, and the server swaps it
 * for an ID token using the client secret — no Google script runs on our
 * pages and no token ever passes through the browser.
 */

export const GOOGLE_STATE_COOKIE = "wale_google_oauth";
/** Covers both /api/auth/google/start and /api/auth/callback/google. */
export const GOOGLE_STATE_COOKIE_PATH = "/api/auth";

export function getGoogleConfig(): { clientId: string; clientSecret: string } | null {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  return clientId && clientSecret ? { clientId, clientSecret } : null;
}

/**
 * Must exactly match an "Authorized redirect URI" on the OAuth client in
 * Google Cloud Console. Uses the configured site URL in production.
 */
export function googleRedirectUri(request: Request): string {
  return `${appBaseUrl(request)}/api/auth/callback/google`;
}

export function googleClient(request: Request) {
  const config = getGoogleConfig();
  if (!config) return null;
  return new OAuth2Client({ ...config, redirectUri: googleRedirectUri(request) });
}

/** A same-site path to return to after sign-in, or null if unsafe. */
export function safeNextPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 500) return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  fullName: string;
}

export type GoogleSignInResult =
  | { ok: true; user: UserRow }
  | { ok: false; reason: "no_account" | "linked_elsewhere" | "suspended" };

/**
 * Finds the account for a verified Google profile, linking it to an
 * existing email/password account with the same (Google-verified) address.
 *
 * New accounts are only created from the sign-up page, where the user has
 * chosen an account type (`role`); from the login page an unknown Google
 * account returns `no_account` instead of silently becoming a student.
 * Existing accounts always keep their role.
 */
export async function findOrCreateGoogleUser(
  profile: GoogleProfile,
  role: SignUpRole | null,
): Promise<GoogleSignInResult> {
  const sql = getSql();
  const existing = (await sql`
    SELECT * FROM users
    WHERE google_sub = ${profile.sub} OR email = ${profile.email}
    ORDER BY (google_sub = ${profile.sub}) DESC NULLS LAST
    LIMIT 1
  `) as UserRow[];

  const user = existing[0];
  if (user) {
    if (user.suspended_at) return { ok: false, reason: "suspended" };
    if (user.google_sub && user.google_sub !== profile.sub) {
      return { ok: false, reason: "linked_elsewhere" };
    }
    if (user.google_sub) return { ok: true, user };

    const linked = (await sql`
      UPDATE users
      SET google_sub = ${profile.sub}, email_verified_at = COALESCE(email_verified_at, NOW())
      WHERE id = ${user.id}
      RETURNING *
    `) as UserRow[];
    return { ok: true, user: linked[0] };
  }

  if (!role) return { ok: false, reason: "no_account" };

  const created = (await sql`
    INSERT INTO users (id, full_name, email, role, google_sub, email_verified_at)
    VALUES (${newId("usr")}, ${profile.fullName}, ${profile.email}, ${role}, ${profile.sub}, NOW())
    RETURNING *
  `) as UserRow[];
  await logActivity(created[0].id, "user.signed_up", `${created[0].full_name} signed up as ${created[0].role} with Google`, { type: "user", id: created[0].id });
  await notify(created[0].id, {
    title: "Welcome to WALE",
    body: "Your account is ready. Fund your wallet, explore homes near your campus, and keep an eye here for updates.",
    link: "/account",
  });
  return { ok: true, user: created[0] };
}

/* --------------------------------------------- Sign-in → sign-up hand-off -- */

/**
 * When someone signs in with a Google account that has no WALE account,
 * their verified Google profile is kept for 15 minutes in this httpOnly
 * cookie (HMAC-signed with the client secret, so it can't be forged or
 * edited) and they're sent to /signup to pick an account type — no second
 * trip to Google needed.
 */
export const GOOGLE_PENDING_COOKIE = "wale_google_pending";
export const GOOGLE_PENDING_MAX_AGE = 15 * 60;

function pendingSignature(payload: string): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return createHmac("sha256", `wale-google-pending:${secret}`).update(payload).digest("base64url");
}

export function sealPendingProfile(profile: GoogleProfile): string {
  const payload = Buffer.from(
    JSON.stringify({ ...profile, exp: Date.now() + GOOGLE_PENDING_MAX_AGE * 1000 }),
  ).toString("base64url");
  return `${payload}.${pendingSignature(payload)}`;
}

export function openPendingProfile(value: string | undefined): GoogleProfile | null {
  if (!value) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature) return null;
  try {
    const expected = Buffer.from(pendingSignature(payload));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as GoogleProfile & { exp: number };
    if (typeof data.exp !== "number" || data.exp < Date.now()) return null;
    if (typeof data.sub !== "string" || typeof data.email !== "string" || typeof data.fullName !== "string") return null;
    return { sub: data.sub, email: data.email, fullName: data.fullName };
  } catch {
    return null;
  }
}
