import { NextResponse } from "next/server";
import { BankLookupError, listBanks } from "@/lib/server/banks";
import { jsonResponse, requireUser } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Nigerian banks (name + code) for the withdrawal form. */
export async function GET() {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;
  try {
    return jsonResponse(await listBanks());
  } catch (error) {
    console.error("[banks]", error instanceof Error ? error.message : "UnknownError");
    return jsonResponse(
      { message: error instanceof BankLookupError ? error.message : "The bank list couldn't be loaded." },
      503,
    );
  }
}
