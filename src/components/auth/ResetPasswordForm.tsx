"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, KeyRound } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { resetPasswordSchema, type ResetPasswordData } from "@/lib/api/schemas";
import { Alert, Button, FormField, PasswordInput } from "@/components/ui";
import { AuthFooterLink, AuthHeading } from "./AuthHeading";
import { fieldErrorsFrom } from "./field-errors";

/**
 * Set a new password from an emailed token.
 *
 * The token arrives in the URL and is submitted as-is — it is never displayed,
 * because showing it invites copying it somewhere less private. The server
 * clears the session cookie on success, so the user is deliberately sent back
 * to sign in with the new password rather than silently kept logged in.
 */
export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ResetPasswordData) => authApi.resetPassword(values),
    onError: (error) => {
      for (const { field, message } of fieldErrorsFrom(error)) {
        if (field === "password" || field === "token") {
          setError(field === "token" ? "root" : "password", { message });
        }
      }
    },
  });

  // A missing token means the link was mangled or hand-typed. Say so plainly
  // instead of rendering a form that cannot possibly succeed.
  if (!token) {
    return (
      <>
        <AuthHeading title="This link isn't valid">
          The reset link is missing its token. It may have been broken across
          two lines by your email client.
        </AuthHeading>

        <Alert tone="warning" title="Request a fresh link">
          Reset links are single-use and expire. Ask for a new one and open it
          directly from the email.
        </Alert>

        <div className="mt-6">
          <Link href="/forgot-password">
            <Button block size="lg">
              Request a new link
            </Button>
          </Link>
        </div>

        <AuthFooterLink prompt="Know your password?" href="/login" label="Sign in" />
      </>
    );
  }

  if (mutation.isSuccess) {
    return (
      <>
        <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-success-subtle text-success">
          <CheckCircle2 aria-hidden="true" className="size-6" />
        </div>

        <AuthHeading title="Password updated">{mutation.data.message}</AuthHeading>

        <Alert tone="info" title="Signed out everywhere">
          For your security, every existing session was ended. Sign in again with
          your new password.
        </Alert>

        <div className="mt-6">
          <Button block size="lg" onClick={() => router.replace("/login")}>
            Go to sign in
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Choose a new password">
        Pick something you haven&apos;t used elsewhere. You&apos;ll sign in with
        it straight after.
      </AuthHeading>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="flex flex-col gap-5"
      >
        {mutation.isError && (
          <Alert tone="danger" title="Couldn't update your password">
            {mutation.error.message}
          </Alert>
        )}

        {/* The token rides along in the form state, never rendered. */}
        <input type="hidden" {...register("token")} />

        <FormField
          label="New password"
          required
          hint="At least 8 characters, with an uppercase letter, a lowercase letter, and a number."
          error={errors.password?.message}
        >
          {(field) => (
            <PasswordInput
              {...field}
              {...register("password")}
              autoComplete="new-password"
              autoFocus
              placeholder="Create a new password"
            />
          )}
        </FormField>

        <FormField
          label="Confirm new password"
          required
          error={errors.confirmPassword?.message}
        >
          {(field) => (
            <PasswordInput
              {...field}
              {...register("confirmPassword")}
              autoComplete="new-password"
              placeholder="Type it again"
            />
          )}
        </FormField>

        <Button
          type="submit"
          size="lg"
          block
          isLoading={mutation.isPending}
          loadingText="Updating…"
        >
          <KeyRound aria-hidden="true" className="size-4" />
          Update password
        </Button>
      </form>

      <AuthFooterLink prompt="Changed your mind?" href="/login" label="Back to sign in" />
    </>
  );
}
