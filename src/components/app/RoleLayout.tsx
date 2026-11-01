"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Button, ErrorState, Spinner } from "@/components/ui";
import type { AuthUser } from "@/lib/api/auth";
import { useRequireRole, useSession } from "@/lib/auth/client-session";

function SessionError({ retry }: { retry: () => unknown }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50/50 p-4">
      <ErrorState
        title="We couldn't check your session"
        description="Check your connection and try again."
        action={<Button onClick={() => void retry()}>Try again</Button>}
      />
    </div>
  );
}

function SessionLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50/50">
      <Spinner />
    </div>
  );
}

/** A dashboard area for one role (e.g. /landlord): guarded, inside the app shell. */
export function RoleLayout({ role, children }: { role: AuthUser["role"]; children: ReactNode }) {
  const { user, isChecking, isError, retry } = useRequireRole(role);
  if (isError) return <SessionError retry={retry} />;
  if (isChecking || !user) return <SessionLoading />;
  return <AppShell user={user}>{children}</AppShell>;
}

/** A page any signed-in user can open (wallet, notifications), inside the app shell. */
export function SignedInLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: user, isPending, isError, refetch } = useSession();

  useEffect(() => {
    if (!isPending && !isError && !user) {
      router.replace(`/login?next=${encodeURIComponent(window.location.pathname)}`);
    }
  }, [isError, isPending, router, user]);

  if (isError) return <SessionError retry={refetch} />;
  if (!user) return <SessionLoading />;
  return <AppShell user={user}>{children}</AppShell>;
}
