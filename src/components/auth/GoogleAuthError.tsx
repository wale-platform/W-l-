"use client";

import { useSearchParams } from "next/navigation";
import { Alert } from "@/components/ui";

/** Messages for the `?error=` codes set by `/api/auth/callback/google`. */
const messages: Record<string, { title: string; body: string; tone: "danger" | "info" }> = {
  google_cancelled: {
    tone: "info",
    title: "Google sign-in cancelled",
    body: "You closed the Google window before finishing. Try again whenever you're ready.",
  },
  google_expired: {
    tone: "danger",
    title: "Google sign-in expired",
    body: "That sign-in attempt timed out or was opened in another tab. Please try again.",
  },
  google_failed: {
    tone: "danger",
    title: "Google sign-in failed",
    body: "We couldn't verify your Google account. Please try again, or use your email and password.",
  },
  google_unverified: {
    tone: "danger",
    title: "Email not verified",
    body: "Google hasn't verified the email address on that account, so it can't be used to sign in.",
  },
  google_linked_elsewhere: {
    tone: "danger",
    title: "Email linked to another Google account",
    body: "This email is already connected to a different Google account. Sign in with that account, or use your email and password.",
  },
  google_suspended: {
    tone: "danger",
    title: "Account suspended",
    body: "This account has been suspended. Contact WALE support if you think this is a mistake.",
  },
  google_no_account: {
    tone: "info",
    title: "No WALE account yet",
    body: "There's no account for that Google email. Choose how you'll use WALE below, then sign up with Google.",
  },
  google_unavailable: {
    tone: "danger",
    title: "Google sign-in unavailable",
    body: "Google sign-in isn't configured on this site right now. Please use your email and password.",
  },
};

/** Must be rendered inside <Suspense> because it reads search params. */
export function GoogleAuthError() {
  const code = useSearchParams().get("error");
  const message = code ? messages[code] : undefined;
  if (!message) return null;

  return (
    <Alert tone={message.tone} title={message.title}>
      {message.body}
    </Alert>
  );
}
