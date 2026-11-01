import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { signUpRoleSchema, type AuthRole, type SignUpRole } from "@/lib/api/schemas";
import { ensureSchema } from "@/lib/server/db";
import {
  findOrCreateGoogleUser,
  getGoogleConfig,
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_COOKIE_PATH,
  googleClient,
  safeNextPath,
} from "@/lib/server/google";
import { createSession } from "@/lib/server/session";
import { logActivity } from "@/lib/server/activity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface PendingSignIn {
  state: string;
  nonce: string;
  codeVerifier: string;
  mode: "signin" | "signup";
  role: SignUpRole | null;
  next: string | null;
}

function readPending(value: string | undefined): PendingSignIn | null {
  if (!value) return null;
  try {
    const data: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof data !== "object" || data === null ||
      !("state" in data) || typeof data.state !== "string" ||
      !("nonce" in data) || typeof data.nonce !== "string" ||
      !("codeVerifier" in data) || typeof data.codeVerifier !== "string"
    ) {
      return null;
    }
    const role = "role" in data ? signUpRoleSchema.safeParse(data.role) : null;
    return {
      state: data.state,
      nonce: data.nonce,
      codeVerifier: data.codeVerifier,
      mode: "mode" in data && data.mode === "signup" ? "signup" : "signin",
      role: role?.success ? role.data : null,
      next: "next" in data ? safeNextPath(data.next) : null,
    };
  } catch {
    return null;
  }
}

function sameString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function dashboardPath(role: AuthRole): string {
  return role === "student" ? "/student" : `/${role}`;
}

/**
 * Step 2: Google redirects back here with `code` and `state`. Verify the
 * state, exchange the code (with the PKCE verifier and client secret) for
 * an ID token, verify the token, then sign the user in.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const pending = readPending(request.cookies.get(GOOGLE_STATE_COOKIE)?.value);
  const origin = pending?.mode === "signup" ? "/signup" : "/login";

  const finish = (path: string) => {
    const response = NextResponse.redirect(new URL(path, request.url));
    response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: GOOGLE_STATE_COOKIE_PATH, maxAge: 0 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  };
  const fail = (code: string, path = origin) => finish(`${path}?error=${code}`);

  // The user closed the consent screen or chose "Cancel".
  if (params.get("error")) return fail("google_cancelled");

  const code = params.get("code");
  const state = params.get("state");
  if (!pending || !code || !state || !sameString(state, pending.state)) {
    return fail("google_expired");
  }

  const client = googleClient(request);
  const config = getGoogleConfig();
  if (!client || !config) return fail("google_unavailable");

  let profile: { sub: string; email: string; fullName: string };
  try {
    const { tokens } = await client.getToken({ code, codeVerifier: pending.codeVerifier });
    if (!tokens.id_token) return fail("google_failed");

    const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || payload.nonce !== pending.nonce) {
      return fail("google_failed");
    }
    if (payload.email_verified !== true) return fail("google_unverified");

    profile = {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      fullName: (payload.name?.trim() || payload.email).slice(0, 120),
    };
  } catch (error) {
    console.error("[google-auth] Code exchange or token verification failed", error instanceof Error ? error.message : "UnknownError");
    return fail("google_failed");
  }

  try {
    await ensureSchema();
    const result = await findOrCreateGoogleUser(
      profile,
      pending.mode === "signup" ? pending.role ?? "student" : null,
    );
    if (!result.ok) {
      // Unknown Google account on the login page: let them pick an account type.
      if (result.reason === "no_account") return fail("google_no_account", "/signup");
      return fail(result.reason === "suspended" ? "google_suspended" : "google_linked_elsewhere");
    }

    await createSession(result.user.id);
    await logActivity(result.user.id, "user.logged_in", `${result.user.full_name} signed in with Google`, { type: "user", id: result.user.id });
    return finish(pending.next ?? dashboardPath(result.user.role));
  } catch (error) {
    console.error("[google-auth] Sign-in failed", error instanceof Error ? error.name : "UnknownError");
    return fail("google_failed");
  }
}
