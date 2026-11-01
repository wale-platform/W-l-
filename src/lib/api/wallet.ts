import {
  boostRequestSchema,
  payoutRequestSchema,
  payoutSchema,
  walletSchema,
  walletTopUpSchema,
  type BoostRequest,
  type Payout,
  type PayoutRequestValues,
  type Wallet,
  type WalletTopUpValues,
} from "./schemas";

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(path, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof result === "object" && result !== null && "message" in result && typeof result.message === "string"
        ? result.message
        : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return result;
}

export const walletApi = {
  async get(): Promise<Wallet> {
    return walletSchema.parse(await request("/api/wallet"));
  },

  /** Starts a top-up and returns the gateway checkout URL to open. */
  async startTopUp(values: WalletTopUpValues): Promise<string> {
    const payload = walletTopUpSchema.parse(values);
    const result = await request("/api/payments/initialize", { method: "POST", body: JSON.stringify(payload) });
    if (
      typeof result !== "object" || result === null ||
      !("authorizationUrl" in result) || typeof result.authorizationUrl !== "string"
    ) {
      throw new Error("The payment provider didn't return a checkout page.");
    }
    return result.authorizationUrl;
  },
};

export interface Bank {
  name: string;
  code: string;
}

export const boostApi = {
  /**
   * Boost a listing. Wallet payments apply at once (`{ status: "paid" }`);
   * gateway payments return a checkout URL to open (`{ status: "redirect" }`).
   */
  async boost(payload: BoostRequest): Promise<{ status: "paid"; boostedUntil: string } | { status: "redirect"; authorizationUrl: string }> {
    return (await request("/api/boosts", { method: "POST", body: JSON.stringify(boostRequestSchema.parse(payload)) })) as
      | { status: "paid"; boostedUntil: string }
      | { status: "redirect"; authorizationUrl: string };
  },
};

export const payoutApi = {
  async banks(): Promise<Bank[]> {
    return (await request("/api/banks")) as Bank[];
  },

  /** The account holder's name as registered with the bank. */
  async resolve(bankCode: string, accountNumber: string): Promise<{ accountName: string; bankName: string }> {
    return (await request(
      `/api/payouts/resolve?bank=${encodeURIComponent(bankCode)}&account=${encodeURIComponent(accountNumber)}`,
    )) as { accountName: string; bankName: string };
  },

  async list(): Promise<Payout[]> {
    return payoutSchema.array().parse(await request("/api/payouts"));
  },

  async request(values: PayoutRequestValues): Promise<Payout> {
    return payoutSchema.parse(
      await request("/api/payouts", { method: "POST", body: JSON.stringify(payoutRequestSchema.parse(values)) }),
    );
  },
};
