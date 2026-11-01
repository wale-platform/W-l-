"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Alert, Avatar, Button, toast } from "@/components/ui";
import { authUserSchema, type SignUpRole } from "@/lib/api/schemas";
import { dashboardPath, useSetSessionUser } from "@/lib/auth/client-session";

const roleLabels: Record<SignUpRole, string> = {
  student: "student",
  landlord: "landlord",
  lawyer: "property lawyer",
  tenant: "outgoing tenant",
};

export interface PendingGoogleProfile {
  email: string;
  fullName: string;
}

async function request(path: string, init?: RequestInit) {
  const response = await fetch(path, { credentials: "same-origin", cache: "no-store", ...init });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : "Something went wrong. Please try again.";
    throw new Error(message);
  }
  return body;
}

/**
 * The Google account waiting to become a WALE account, on
 * /signup?google=continue (after signing in with a Google account that has
 * no WALE account). Must be used inside <Suspense> (reads search params).
 */
export function useGooglePending() {
  const active = useSearchParams().get("google") === "continue";
  const query = useQuery({
    queryKey: ["google-pending"],
    queryFn: () => request("/api/auth/google/pending") as Promise<PendingGoogleProfile>,
    enabled: active,
    retry: false,
  });
  return {
    /** Set once the pending Google profile has loaded. */
    profile: active ? query.data : undefined,
    /** The hand-off cookie expired or is missing: fall back to the normal form. */
    expired: active && query.isError,
    loading: active && query.isPending,
  };
}

/** Finish a Google sign-up with the chosen account type in one click. */
export function GoogleContinuePanel({ profile, role }: { profile: PendingGoogleProfile; role: SignUpRole }) {
  const router = useRouter();
  const setSessionUser = useSetSessionUser();

  const complete = useMutation({
    mutationFn: async () => {
      const body = await request("/api/auth/google/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      return authUserSchema.parse((body as { user: unknown }).user);
    },
    onSuccess: (user) => {
      setSessionUser(user);
      toast.success("Account ready", { description: `Welcome to WALE, ${user.fullName}.` });
      router.push(dashboardPath(user.role));
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 rounded-2xl bg-brand-50/70 p-3 ring-1 ring-brand-100">
        <Avatar name={profile.fullName} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-ink-900">{profile.fullName}</p>
          <p className="truncate text-xs text-ink-600">Signing up with Google as {profile.email}</p>
        </div>
      </div>

      {complete.isError && (
        <Alert tone="danger" title="Account not created">
          {complete.error.message}
        </Alert>
      )}

      <Button
        type="button"
        size="lg"
        block
        onClick={() => complete.mutate()}
        isLoading={complete.isPending}
        loadingText="Creating account…"
      >
        Continue as a {roleLabels[role]}
      </Button>

      <p className="text-center text-xs text-ink-500">
        Not what you wanted?{" "}
        <Link href="/signup" className="font-semibold text-brand-700 hover:underline">
          Sign up with email instead
        </Link>
      </p>
    </div>
  );
}
