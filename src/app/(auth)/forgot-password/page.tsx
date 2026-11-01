"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { forgotPasswordSchema, type ForgotPasswordData } from "@/lib/api/schemas";
import {
  Button,
  FormField,
  Input,
  Alert,
  toast,
} from "@/components/ui";

export default function ForgotPasswordPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: authApi.forgotPassword,
    onSuccess: () => {
      toast.success("Check your email", {
        description: "If an account exists, a reset link is on its way.",
      });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          Reset your password
        </h1>
        <p className="text-sm text-ink-500">
          Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {mutation.isError && (
        <Alert tone="danger" title="Couldn't send link">
          {mutation.error.message}
        </Alert>
      )}

      {mutation.isSuccess ? (
        <div className="flex flex-col gap-5">
          <Alert tone="success" title="Check your email">
            If an account exists for {mutation.variables.email}, we&apos;ve sent a link to
            reset the password. It expires in 1 hour — check your spam folder if you
            don&apos;t see it.
          </Alert>

          <Button tone="outline" block onClick={() => mutation.reset()}>
            Send link again
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit((values) => mutation.mutate(values))}
          noValidate
          className="flex flex-col gap-5"
        >
          <FormField label="Email address" required error={errors.email?.message}>
            {(field) => (
              <Input
                {...field}
                {...register("email")}
                type="email"
                autoComplete="email"
                placeholder="amina@example.com"
              />
            )}
          </FormField>

          <Button
            type="submit"
            size="lg"
            block
            isLoading={mutation.isPending}
            loadingText="Sending link..."
            className="mt-2"
          >
            Send reset link
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-ink-600">
        Remember your password?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-brand-600"
        >
          Back to login
        </Link>
      </p>
    </div>
  );
}
