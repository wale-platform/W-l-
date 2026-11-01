import { getCurrentUser, jsonResponse, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return jsonResponse({ message: "Not signed in.", user: null }, 401);
    return jsonResponse({ user });
  } catch (error) {
    return serverErrorResponse("auth:me", error);
  }
}
