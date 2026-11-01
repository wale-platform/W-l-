import { NextResponse, type NextRequest } from "next/server";
import { BankLookupError, findBank, resolveAccountName } from "@/lib/server/banks";
import { jsonResponse, requireUser } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Look up the account holder's name: `?bank=<code>&account=<10 digits>`. */
export async function GET(request: NextRequest) {
  const auth = await requireUser(["student", "landlord", "lawyer", "tenant"]);
  if (auth instanceof NextResponse) return auth;

  const bankCode = request.nextUrl.searchParams.get("bank") ?? "";
  const accountNumber = request.nextUrl.searchParams.get("account") ?? "";
  if (!/^\d{10}$/.test(accountNumber)) return jsonResponse({ message: "Account numbers are 10 digits." }, 422);

  try {
    const bank = await findBank(bankCode);
    if (!bank) return jsonResponse({ message: "Choose your bank." }, 422);
    const accountName = await resolveAccountName(accountNumber, bank.code);
    return jsonResponse({ accountName, bankName: bank.name });
  } catch (error) {
    const message = error instanceof BankLookupError ? error.message : "The account couldn't be checked. Try again.";
    return jsonResponse({ message }, error instanceof BankLookupError ? 422 : 502);
  }
}
