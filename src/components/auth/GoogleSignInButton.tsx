"use client";

import { useState } from "react";
import { Alert } from "@/components/ui";
import type { SignUpRole } from "@/lib/api/schemas";
import { cn } from "@/lib/utils/cn";

interface GoogleSignInButtonProps {
  /** `signup` creates an account with `accountRole` if none exists. */
  mode: "signin" | "signup";
  accountRole?: SignUpRole;
  disabled?: boolean;
}

const isConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);

const roleLabels: Record<SignUpRole, string> = {
  student: "student / housing-seeker",
  landlord: "landlord",
  lawyer: "property lawyer",
  tenant: "outgoing tenant",
};

/**
 * Starts the server-side Google OAuth flow (`/api/auth/google/start`).
 * A full-page navigation rather than a popup, so it works in browsers that
 * block third-party cookies and needs no Google script on the page.
 */
export function GoogleSignInButton({ mode, accountRole, disabled = false }: GoogleSignInButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  if (!isConfigured) {
    return (
      <Alert tone="info" title="Google sign-in unavailable">
        Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your environment and restart the app to enable Google sign-in.
      </Alert>
    );
  }

  const start = () => {
    const params = new URLSearchParams({ mode });
    if (mode === "signup" && accountRole) params.set("role", accountRole);
    // Carry the page Proxy sent the user from, so they land back on it.
    const next = new URLSearchParams(window.location.search).get("next");
    if (next) params.set("next", next);

    setIsRedirecting(true);
    // A route handler that redirects off-site to Google, so it needs a full
    // page load — the client router can't navigate to it.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/auth/google/start?${params}`);
  };

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={disabled || isRedirecting}
        aria-busy={isRedirecting || undefined}
        className={cn(
          "flex h-11 w-full items-center justify-center gap-3 rounded-field border border-ink-300 bg-white px-4",
          "text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50",
          "disabled:cursor-not-allowed disabled:opacity-60",
        )}
      >
        <GoogleLogo />
        {isRedirecting
          ? "Redirecting to Google…"
          : mode === "signup"
            ? "Sign up with Google"
            : "Continue with Google"}
      </button>
      {mode === "signup" && accountRole && (
        <p className="mt-2 text-center text-xs leading-5 text-ink-500">
          Google sign-up creates a {roleLabels[accountRole]} account.
        </p>
      )}
    </div>
  );
}

/** Google's multicolour "G" mark, per Google's sign-in branding guidelines. */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5 shrink-0">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
