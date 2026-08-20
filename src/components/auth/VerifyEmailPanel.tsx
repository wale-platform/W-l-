"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { BadgeCheck, MailWarning, Send } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { AUTH_QUERY_KEY } from "@/hooks/useAuth";
import {
  resendVerificationSchema,
  roleHomePath,
  type ResendVerificationData,
} from "@/lib/api/schemas";
import { Alert, Button, FormField, Input, Spinner } from "@/components/ui";
import { AuthHeading } from "./AuthHeading";

/**
 * Email verification.
 *
 * With a token in the URL this verifies immediately on mount — the user clicked
 * a link, so making them press another button is pure friction. Without one it
 * becomes a "resend the link" form, which is the state someone lands in when
 * they navigate here directly after signing up.
 */
export function VerifyEmailPanel({ token }: { token?: string }) {
  const queryClient = useQueryClient();

  const verify = useMutation({
    mutationFn: (value: string) => authApi.verifyEmail(value),
    onSuccess: ({ user }) => {
      // The user object just changed (emailVerified flipped) — write it through
      // so any authed chrome stops nagging about verification.
      queryClient.setQueryData(AUTH_QUERY_KEY, user);
    },
  });

  // Verify once per token. A ref rather than a bare dependency array because
  // React may mount effects twice in development, and verification tokens are
  // single-use — the second attempt would fail and show a spurious error.
  const attempted = useRef<string | null>(null);
  useEffect(() => {
    if (!token || attempted.current === token) return;
    attempted.current = token;
    verify.mutate(token);
    // `verify` is a stable mutation object; including it would re-run this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (token && verify.isPending) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <Spinner className="size-6 text-brand-600" />
        <p className="text-sm text-ink-600">Verifying your email address…</p>
      </div>
    );
  }

  if (verify.isSuccess) {
    const home = roleHomePath[verify.data.user.role];
    return (
      <>
        <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-success-subtle text-success">
          <BadgeCheck aria-hidden="true" className="size-6" />
        </div>

        <AuthHeading title="Email verified">
          You&apos;re all set, {verify.data.user.firstName ?? "there"}. Your
          account is confirmed and ready to use.
        </AuthHeading>

        <Link href={home}>
          <Button block size="lg">
            Go to your dashboard
          </Button>
        </Link>

        <p className="mt-8 text-center text-sm text-ink-600">
          Or{" "}
          <Link
            href="/properties"
            className="font-semibold text-brand-700 underline-offset-4 hover:underline"
          >
            start browsing homes
          </Link>
          .
        </p>
      </>
    );
  }

  // Either the token failed, or there was no token to begin with.
  return <ResendPanel failed={verify.isError} error={verify.error?.message} />;
}

function ResendPanel({ failed, error }: { failed: boolean; error?: string }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResendVerificationData>({
    resolver: zodResolver(resendVerificationSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  const resend = useMutation({
    mutationFn: (values: ResendVerificationData) => authApi.resendVerification(values),
  });

  return (
    <>
      <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-warning-subtle text-warning">
        <MailWarning aria-hidden="true" className="size-6" />
      </div>

      <AuthHeading title={failed ? "That link didn't work" : "Verify your email"}>
        {failed
          ? "Verification links are single-use and expire after a while. Enter your email and we'll send a fresh one."
          : "Enter the email address on your account and we'll send you a new verification link."}
      </AuthHeading>

      {failed && error && (
        <div className="mb-5">
          <Alert tone="danger" title="Verification failed">
            {error}
          </Alert>
        </div>
      )}

      {resend.isSuccess ? (
        <Alert tone="success" title="On its way">
          {resend.data.message}
        </Alert>
      ) : (
        <form
          onSubmit={handleSubmit((values) => resend.mutate(values))}
          noValidate
          className="flex flex-col gap-5"
        >
          {resend.isError && (
            <Alert tone="danger" title="Couldn't send the link">
              {resend.error.message}
            </Alert>
          )}

          <FormField label="Email address" required error={errors.email?.message}>
            {(field) => (
              <Input
                {...field}
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
              />
            )}
          </FormField>

          <Button
            type="submit"
            size="lg"
            block
            isLoading={resend.isPending}
            loadingText="Sending…"
          >
            <Send aria-hidden="true" className="size-4" />
            Send verification link
          </Button>
        </form>
      )}

      <p className="mt-8 text-center text-sm text-ink-600">
        <Link
          href="/login"
          className="font-semibold text-brand-700 underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </>
  );
}
