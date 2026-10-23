import { OAuth2Client } from "google-auth-library";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const googleClient = new OAuth2Client();
const MAX_CREDENTIAL_LENGTH = 10_000;
const GOOGLE_ACCOUNT_ROLES = ["student", "landlord", "lawyer", "tenant"] as const;
type GoogleAccountRole = (typeof GOOGLE_ACCOUNT_ROLES)[number];

function isGoogleAccountRole(value: unknown): value is GoogleAccountRole {
  return GOOGLE_ACCOUNT_ROLES.some((role) => role === value);
}

export async function POST(request: Request) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { message: "Google sign-in is not configured for this site yet." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Invalid sign-in request." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("credential" in body) ||
    typeof body.credential !== "string" ||
    body.credential.length === 0 ||
    body.credential.length > MAX_CREDENTIAL_LENGTH
  ) {
    return NextResponse.json(
      { message: "A valid Google credential is required." },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  const requestedRole = "role" in body ? body.role : "student";
  if (!isGoogleAccountRole(requestedRole)) {
    return NextResponse.json(
      { message: "Select a valid account type to continue." },
      { status: 422, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: body.credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (
      !payload?.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      return NextResponse.json(
        { message: "Google could not verify this account's email address." },
        { status: 401, headers: { "Cache-Control": "no-store" } },
      );
    }

    const user = {
      id: `google:${payload.sub}`,
      fullName: payload.name?.trim() || payload.email,
      email: payload.email.toLowerCase(),
      role: requestedRole,
      createdAt: new Date().toISOString(),
    };

    return NextResponse.json(
      { message: "Signed in with Google.", user },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    console.error(
      "[google-auth] ID token verification failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return NextResponse.json(
      { message: "Google sign-in could not be verified. Please try again." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }
}
