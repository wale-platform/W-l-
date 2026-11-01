import { type NextRequest } from "next/server";
import { signUpRoleSchema } from "@/lib/api/schemas";
import { ensureSchema } from "@/lib/server/db";
import { logActivity } from "@/lib/server/activity";
import {
  findOrCreateGoogleUser,
  GOOGLE_PENDING_COOKIE,
  GOOGLE_STATE_COOKIE_PATH,
  openPendingProfile,
} from "@/lib/server/google";
import {
  createSession,
  jsonResponse,
  readJsonBody,
  serverErrorResponse,
  toAuthUser,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Finish a Google sign-up started from the login page: `{ role: "student" }`.
 * The Google identity comes only from the signed pending cookie, never from
 * the request body.
 */
export async function POST(request: NextRequest) {
  const profile = openPendingProfile(request.cookies.get(GOOGLE_PENDING_COOKIE)?.value);
  if (!profile) {
    return jsonResponse({ message: "Your Google sign-in expired. Please continue with Google again." }, 410);
  }

  const body = await readJsonBody(request);
  const role = signUpRoleSchema.safeParse(
    typeof body === "object" && body !== null && "role" in body ? body.role : undefined,
  );
  if (!role.success) return jsonResponse({ message: "Choose how you'll use WALE.", field: "role" }, 422);

  try {
    await ensureSchema();
    const result = await findOrCreateGoogleUser(profile, role.data);
    if (!result.ok) {
      return jsonResponse(
        {
          message:
            result.reason === "suspended"
              ? "This account has been suspended. Contact WALE support if you think this is a mistake."
              : "This email is linked to a different Google account.",
        },
        result.reason === "suspended" ? 403 : 409,
      );
    }

    await createSession(result.user.id);
    await logActivity(result.user.id, "user.logged_in", `${result.user.full_name} signed in with Google`, { type: "user", id: result.user.id });

    const response = jsonResponse({ message: "Your account is ready.", user: toAuthUser(result.user) }, 201);
    response.cookies.set(GOOGLE_PENDING_COOKIE, "", { path: GOOGLE_STATE_COOKIE_PATH, maxAge: 0 });
    return response;
  } catch (error) {
    return serverErrorResponse("google-auth:complete", error);
  }
}
