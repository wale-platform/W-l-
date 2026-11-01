import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/server/auth-tokens";
import {
  getUserRow,
  jsonResponse,
  requireUser,
  serverErrorResponse,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.emailVerified) {
    return jsonResponse({ message: "Your email address is already confirmed." }, 409);
  }

  try {
    const user = await getUserRow(auth.id);
    if (!user) return jsonResponse({ message: "Please log in to continue." }, 401);

    const sent = await sendVerificationEmail(request, user);
    if (!sent) {
      return jsonResponse({ message: "We just sent a link. Please wait a minute before asking again." }, 429);
    }
    return jsonResponse({ message: `We've sent a new confirmation link to ${user.email}.` });
  } catch (error) {
    return serverErrorResponse("auth:resend-verification", error);
  }
}
