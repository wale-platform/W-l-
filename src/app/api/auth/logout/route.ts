import { destroySession, jsonResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  await destroySession();
  return jsonResponse({ message: "Logged out." });
}
