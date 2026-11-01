"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { sessionKey } from "@/lib/auth/client-session";
import { Alert, Button, Spinner } from "@/components/ui";

/** Redeems the emailed verification token as soon as the page opens. */
export function VerifyEmail({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: authApi.verifyEmail,
    // A signed-in user's cached session still says "unverified".
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKey }),
  });
  const { mutate } = mutation;

  // Tokens are single-use, so StrictMode's second effect run must not
  // redeem it again and replace the success with an "already used" error.
  const submitted = useRef(false);
  useEffect(() => {
    if (!token || submitted.current) return;
    submitted.current = true;
    mutate(token);
  }, [mutate, token]);

  if (!token) {
    return (
      <Alert tone="danger" title="Missing verification link">
        Open the link from your confirmation email. You can request a new one from your dashboard.
      </Alert>
    );
  }

  if (mutation.isError) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="danger" title="Couldn't confirm your email">
          {mutation.error.message}
        </Alert>
        <Link href="/login">
          <Button tone="outline" block>Go to login</Button>
        </Link>
      </div>
    );
  }

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col gap-4">
        <Alert tone="success" title="Email confirmed">
          {mutation.data.message} Thanks for confirming.
        </Alert>
        <Link href="/login">
          <Button block>Continue to WALE</Button>
        </Link>
      </div>
    );
  }

  return (
    <p className="flex items-center gap-3 text-sm text-ink-600" role="status">
      <Spinner /> Confirming your email…
    </p>
  );
}
