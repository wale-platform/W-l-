import { consumeToken } from "@/lib/server/auth-tokens";
import { ensureSchema, getSql } from "@/lib/server/db";
import { jsonResponse, readJsonBody, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Confirms an email address from the emailed link. This is a POST made by
 * the /verify-email page rather than a GET on the link itself, so email
 * scanners that prefetch links can't use up the token.
 */
export async function POST(request: Request) {
  const body = await readJsonBody(request);
  const token =
    typeof body === "object" && body !== null && "token" in body && typeof body.token === "string"
      ? body.token
      : "";
  if (token.length < 20 || token.length > 200) {
    return jsonResponse({ message: "This verification link is invalid." }, 422);
  }

  try {
    await ensureSchema();
    const userId = await consumeToken(token, "email_verification");
    if (!userId) {
      return jsonResponse(
        { message: "This verification link is invalid or has expired. Request a new one from your dashboard." },
        400,
      );
    }

    await getSql()`
      UPDATE users SET email_verified_at = COALESCE(email_verified_at, NOW()) WHERE id = ${userId}
    `;
    return jsonResponse({ message: "Your email address is confirmed." });
  } catch (error) {
    return serverErrorResponse("auth:verify-email", error);
  }
}
