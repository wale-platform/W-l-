import { type NextRequest } from "next/server";
import { GOOGLE_PENDING_COOKIE, openPendingProfile } from "@/lib/server/google";
import { jsonResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The Google profile waiting to become an account (shown on /signup), if any. */
export async function GET(request: NextRequest) {
  const profile = openPendingProfile(request.cookies.get(GOOGLE_PENDING_COOKIE)?.value);
  if (!profile) return jsonResponse({ message: "No Google sign-up in progress." }, 404);
  return jsonResponse({ email: profile.email, fullName: profile.fullName });
}
