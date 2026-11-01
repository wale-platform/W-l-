import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { AuthRole, AuthUser } from "@/lib/api/schemas";
import { DatabaseNotConfiguredError, ensureSchema, getSql } from "./db";

/**
 * Database-backed sessions.
 *
 * The browser holds an opaque random token in an httpOnly cookie; the
 * database stores only its SHA-256, so a leaked sessions table cannot be
 * replayed. Logging out deletes the row, which revokes the session
 * immediately — something a stateless JWT cannot do.
 */

export const SESSION_COOKIE = "wale_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Without "Remember me" the cookie ends with the browser session. */
const SHORT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface UserRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AuthRole;
  university: string | null;
  password_hash: string | null;
  google_sub: string | null;
  email_verified_at: string | Date | null;
  suspended_at?: string | Date | null;
  created_at: string | Date;
}

export function toAuthUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone ?? undefined,
    role: row.role,
    university: row.university ?? undefined,
    emailVerified: row.email_verified_at !== null,
    hasPassword: row.password_hash !== null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export function newId(prefix: string): string {
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function randomToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createSession(
  userId: string,
  { remember = true }: { remember?: boolean } = {},
): Promise<void> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + (remember ? SESSION_TTL_MS : SHORT_SESSION_TTL_MS));
  const sql = getSql();

  await sql`
    INSERT INTO sessions (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${userId}, ${expiresAt.toISOString()})
  `;
  // Opportunistic cleanup so expired rows don't accumulate.
  await sql`DELETE FROM sessions WHERE expires_at < NOW()`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(remember ? { expires: expiresAt } : {}),
  });
}

/** Sign a user out everywhere, e.g. after their password changes. */
export async function deleteAllSessions(userId: string): Promise<void> {
  await getSql()`DELETE FROM sessions WHERE user_id = ${userId}`;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await ensureSchema();
      await getSql()`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
    } catch (error) {
      // The cookie is still cleared below, so the user is logged out locally.
      console.error("[auth] Failed to delete session", error instanceof Error ? error.name : "UnknownError");
    }
  }
  cookieStore.delete(SESSION_COOKIE);
}

/** The signed-in user, or `null` when there is no valid session. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  await ensureSchema();
  const rows = (await getSql()`
    SELECT u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > NOW()
      -- A suspended account's sessions stop working immediately.
      AND u.suspended_at IS NULL
    LIMIT 1
  `) as UserRow[];

  return rows[0] ? toAuthUser(rows[0]) : null;
}

const NO_STORE = { "Cache-Control": "no-store, private" };

export function jsonResponse(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * Resolves the current user for a route handler, or returns the error
 * response to send. Usage:
 *
 *   const auth = await requireUser(["landlord"]);
 *   if (auth instanceof NextResponse) return auth;
 */
export async function requireUser(roles?: readonly AuthRole[]): Promise<AuthUser | NextResponse> {
  let user: AuthUser | null;
  try {
    user = await getCurrentUser();
  } catch (error) {
    return serverErrorResponse("auth", error);
  }

  if (!user) return jsonResponse({ message: "Please log in to continue." }, 401);
  if (roles && !roles.includes(user.role)) {
    return jsonResponse({ message: "Your account doesn't have access to this action." }, 403);
  }
  return user;
}

export function serverErrorResponse(scope: string, error: unknown): NextResponse {
  if (error instanceof DatabaseNotConfiguredError) {
    console.error(`[${scope}] DATABASE_URL is not configured`);
    return jsonResponse({ message: "This service is temporarily unavailable. Please try again later." }, 503);
  }
  console.error(`[${scope}] Request failed`, error instanceof Error ? error.name : "UnknownError");
  return jsonResponse({ message: "Something went wrong on our side. Please try again." }, 500);
}

export async function getUserRow(userId: string): Promise<UserRow | null> {
  const rows = (await getSql()`SELECT * FROM users WHERE id = ${userId} LIMIT 1`) as UserRow[];
  return rows[0] ?? null;
}

/** Parse a JSON body, returning `undefined` instead of throwing. */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
