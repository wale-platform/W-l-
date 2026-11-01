/**
 * Nigerian banks and account-name lookup via Paystack
 * (`GET /bank`, `GET /bank/resolve`), used for wallet withdrawals so the
 * user can confirm the account holder's name before money is sent.
 *
 * In Paystack test mode only the "Test Bank" (code 001) resolves, so it is
 * added to the list when a sk_test_ key is configured.
 */

const PAYSTACK_API = "https://api.paystack.co";
const CACHE_MS = 24 * 60 * 60 * 1000;

export interface Bank {
  name: string;
  code: string;
}

export class BankLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BankLookupError";
  }
}

let cache: { banks: Bank[]; at: number } | null = null;

function secret(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new BankLookupError("Bank lookup isn't available yet.");
  return key;
}

const isTestMode = () => (process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_test_");

export async function listBanks(): Promise<Bank[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.banks;

  const response = await fetch(`${PAYSTACK_API}/bank?country=nigeria&currency=NGN&perPage=500`, {
    headers: { Authorization: `Bearer ${secret()}` },
    signal: AbortSignal.timeout(15_000),
    cache: "no-store",
  });
  const body = (await response.json().catch(() => null)) as {
    data?: { name: string; code: string; active?: boolean; is_deleted?: boolean }[];
  } | null;
  if (!response.ok || !Array.isArray(body?.data)) throw new BankLookupError("The bank list couldn't be loaded.");

  const seen = new Set<string>();
  const banks = body.data
    .filter((bank) => bank.active !== false && !bank.is_deleted && bank.code && !seen.has(bank.code) && seen.add(bank.code))
    .map((bank) => ({ name: bank.name.trim(), code: bank.code }))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isTestMode()) banks.unshift({ name: "Test Bank (Paystack test mode)", code: "001" });
  cache = { banks, at: Date.now() };
  return banks;
}

export async function findBank(code: string): Promise<Bank | null> {
  return (await listBanks()).find((bank) => bank.code === code) ?? null;
}

/** The account holder's name as registered with the bank. */
export async function resolveAccountName(accountNumber: string, bankCode: string): Promise<string> {
  if (!/^\d{10}$/.test(accountNumber)) throw new BankLookupError("Account numbers are 10 digits.");
  const response = await fetch(
    `${PAYSTACK_API}/bank/resolve?account_number=${accountNumber}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: { Authorization: `Bearer ${secret()}` }, signal: AbortSignal.timeout(15_000), cache: "no-store" },
  );
  const body = (await response.json().catch(() => null)) as { data?: { account_name?: string } } | null;
  const name = body?.data?.account_name?.trim();
  if (!response.ok || !name) {
    throw new BankLookupError("We couldn't find that account. Check the account number and bank.");
  }
  return name;
}
