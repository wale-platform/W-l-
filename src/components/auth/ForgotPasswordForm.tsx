"use client";

import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { MailCheck, Send } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { authApi } from "@/lib/api/auth";
import { forgotPasswordSchema, type ForgotPasswordData } from "@/lib/api/schemas";
import { Alert, Button, FormField, Input } from "@/components/ui";
import { AuthFooterLink, AuthHeading } from "./AuthHeading";

/**
 * Request a password-reset link.
 *
 * The backend answers identically whether or not an account exists, so this
 * form cannot be used to find out which emails are registered. The success
 * panel repeats that wording rather than claiming "we sent you an email",
 * which would assert something we deliberately do not confirm.
 */
export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: (values: ForgotPasswordData) => authApi.forgotPassword(values),
  });

  if (mutation.isSuccess) {
    return (
      <>
        <div className="mb-6 flex size-12 items-center justify-center rounded-full bg-success-subtle text-success">
          <MailCheck aria-hidden="true" className="size-6" />
        </div>

        <AuthHeading title="Check your inbox">
          {/* The server's own wording — it is careful not to confirm whether
              the address has an account, and so are we. */}
          {mutation.data.message}
        </AuthHeading>

        <Alert tone="info" title="Didn't get anything?">
          Give it a few minutes and check your spam folder. The link expires for
          your security, so request a new one if it has been a while.
        </Alert>

        <div className="mt-6">
          <Button
            tone="outline"
            block
            onClick={() => mutation.mutate(getValues())}
            isLoading={mutation.isPending}
            loadingText="Sending…"
          >
            Send another link
          </Button>
        </div>

        <AuthFooterLink prompt="Remembered it?" href="/login" label="Back to sign in" />
      </>
    );
  }

  return (
    <>
      <AuthHeading title="Reset your password">
        Enter the email address on your account and we&apos;ll send you a link to
        set a new password.
      </AuthHeading>

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="flex flex-col gap-5"
      >
        {mutation.isError && (
          <Alert tone="danger" title="Couldn't send the link">
            {mutation.error.message}
          </Alert>
        )}

        <FormField label="Email address" required error={errors.email?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("email")}
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
            />
          )}
        </FormField>

        <Button
          type="submit"
          size="lg"
          block
          isLoading={mutation.isPending}
          loadingText="Sending link…"
        >
          <Send aria-hidden="true" className="size-4" />
          Send reset link
        </Button>
      </form>

      <AuthFooterLink prompt="Remembered it?" href="/login" label="Back to sign in" />
    </>
  );
}
