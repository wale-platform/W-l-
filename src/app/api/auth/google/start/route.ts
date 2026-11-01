import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { CodeChallengeMethod } from "google-auth-library";
import { signUpRoleSchema } from "@/lib/api/schemas";
import {
  GOOGLE_STATE_COOKIE,
  GOOGLE_STATE_COOKIE_PATH,
  googleClient,
  safeNextPath,
} from "@/lib/server/google";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Step 1: send the browser to Google's consent screen.
 *
 *   /api/auth/google/start?mode=signup&role=landlord
 *   /api/auth/google/start?mode=signin&next=/landlord/upload-property
 *
 * `state` (CSRF), `nonce` (ID-token replay) and the PKCE verifier are kept
 * in a short-lived httpOnly cookie scoped to the auth routes, and
 * checked when Google redirects back.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("mode") === "signup" ? "signup" : "signin";
  const origin = mode === "signup" ? "/signup" : "/login";

  const client = googleClient(request);
  if (!client) {
    console.error("[google-auth] NEXT_PUBLIC_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set");
    return NextResponse.redirect(new URL(`${origin}?error=google_unavailable`, request.url));
  }

  const role = signUpRoleSchema.safeParse(params.get("role"));
  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");

  const authUrl = client.generateAuthUrl({
    scope: ["openid", "email", "profile"],
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: CodeChallengeMethod.S256,
    prompt: "select_account",
  });

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(
    GOOGLE_STATE_COOKIE,
    Buffer.from(
      JSON.stringify({
        state,
        nonce,
        codeVerifier,
        mode,
        // Only sign-up creates accounts, so only sign-up carries a role.
        role: mode === "signup" && role.success ? role.data : null,
        next: safeNextPath(params.get("next")),
      }),
    ).toString("base64url"),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      // Lax so the cookie is sent on Google's top-level redirect back.
      sameSite: "lax",
      path: GOOGLE_STATE_COOKIE_PATH,
      maxAge: 10 * 60,
    },
  );
  response.headers.set("Cache-Control", "no-store");
  return response;
}
