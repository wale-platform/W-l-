"use client";

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
 * Shown on /signup?google=continue after someone signed in with a Google
 * account that has no WALE account yet: confirm the account type and create
 * the account in one click. Must be rendered inside <Suspense>.
 */
export function GoogleContinue({ role }: { role: SignUpRole }) {
  const router = useRouter();
  const setSessionUser = useSetSessionUser();
  const active = useSearchParams().get("google") === "continue";

  const pending = useQuery({
    queryKey: ["google-pending"],
    queryFn: () => request("/api/auth/google/pending") as Promise<{ email: string; fullName: string }>,
    enabled: active,
    retry: false,
  });

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

  if (!active) return null;
  if (pending.isError) {
    return (
      <Alert tone="info" title="Your Google sign-in expired">
        Choose how you&apos;ll use WALE below, then sign up with Google again.
      </Alert>
    );
  }
  if (!pending.data) return null;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-brand-50 to-white p-4 ring-1 ring-brand-100 sm:p-5">
      <div className="flex items-center gap-3">
        <Avatar name={pending.data.fullName} />
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink-900">Almost there, {pending.data.fullName.split(/\s+/)[0]}!</p>
          <p className="truncate text-xs text-ink-600">
            No WALE account uses {pending.data.email} yet. Pick your account type below, then create it.
          </p>
        </div>
      </div>
      {complete.isError && (
        <Alert tone="danger" title="Account not created" className="mt-3">
          {complete.error.message}
        </Alert>
      )}
      <Button block className="mt-4" onClick={() => complete.mutate()} isLoading={complete.isPending} loadingText="Creating account…">
        Create my {roleLabels[role]} account with Google
      </Button>
    </div>
  );
}
