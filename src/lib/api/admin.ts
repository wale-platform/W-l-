import type { AuthRole, Payout, PropertyType } from "./schemas";

/** Client for the admin-only `/api/admin/*` endpoints. Money is in kobo. */

export interface AdminOverview {
  users: {
    total: number;
    byRole: Record<AuthRole, number>;
    suspended: number;
    newThisWeek: number;
  };
  listings: { total: number; pending: number; verified: number };
  inspections: { total: number; pending: number; approved: number; completed: number };
  payments: { successful: number; pending: number; failed: number; collectedKobo: number; collected30dKobo: number };
  wallets: { totalBalanceKobo: number };
  payouts: { pending: number; pendingKobo: number; paidKobo: number };
  recentActivity: { id: string; action: string; summary: string; actorName: string | null; createdAt: string }[];
}

export interface AdminUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: AuthRole;
  createdAt: string;
  suspended: boolean;
  emailVerified: boolean;
  signIn: string;
  walletBalanceKobo: number;
  listings: number;
  lastLoginAt: string | null;
  isYou: boolean;
}

export interface AdminListing {
  id: string;
  title: string;
  price: number;
  type: PropertyType;
  location: string;
  university: string | null;
  source: string;
  verified: boolean;
  boostedUntil: string | null;
  createdAt: string;
  image: string | null;
  inspections: number;
  owner: { id: string; name: string; email: string; phone: string };
}

export interface AdminPayment {
  reference: string;
  provider: "paystack" | "flutterwave";
  amountKobo: number;
  status: "pending" | "success" | "failed";
  transactionId: string | null;
  purpose: string;
  createdAt: string;
  paidAt: string | null;
  user: { id: string; name: string; email: string };
}

export interface ActivityEntry {
  id: string;
  action: string;
  summary: string;
  target: { type: string; id: string } | null;
  actor: { id: string; name: string; role: AuthRole } | null;
  createdAt: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
  return result as T;
}

const query = (params: Record<string, string | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const text = search.toString();
  return text ? `?${text}` : "";
};

export const adminApi = {
  overview: () => request<AdminOverview>("/api/admin/overview"),

  users: (filters: { q?: string; role?: string; status?: string } = {}) =>
    request<AdminUser[]>(`/api/admin/users${query(filters)}`),
  updateUser: (id: string, change: { role?: AuthRole; suspended?: boolean }) =>
    request<{ success: true }>(`/api/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(change) }),
  deleteUser: (id: string) =>
    request<{ success: true }>(`/api/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),

  listings: (filters: { q?: string; status?: string } = {}) =>
    request<AdminListing[]>(`/api/admin/listings${query(filters)}`),

  payments: (filters: { q?: string; status?: string; provider?: string } = {}) =>
    request<AdminPayment[]>(`/api/admin/payments${query(filters)}`),
  verifyPayment: (reference: string) =>
    request<{ result: string; message: string }>(`/api/admin/payments/${encodeURIComponent(reference)}/verify`, { method: "POST" }),

  payouts: (status?: string) => request<Payout[]>(`/api/admin/payouts${query({ status })}`),
  markPayoutPaid: (id: string, reference: string, note?: string) =>
    request<{ success: true }>(`/api/admin/payouts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "paid", reference, note }),
    }),
  rejectPayout: (id: string, note: string) =>
    request<{ success: true }>(`/api/admin/payouts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ action: "reject", note }),
    }),

  activity: (filters: { category?: string; q?: string; before?: string } = {}) =>
    request<{ entries: ActivityEntry[]; nextCursor: string | null }>(`/api/admin/activity${query(filters)}`),
};
