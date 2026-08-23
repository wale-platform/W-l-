"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, Mail } from "lucide-react";
import { useAuth, useAuthActions } from "@/hooks/useAuth";
import { loginSchema, roleHomePath, type LoginData } from "@/lib/api/schemas";
import { Alert, Button, FormField, Input, PasswordInput } from "@/components/ui";
import { AuthFooterLink, AuthHeading, safeRedirect } from "./AuthHeading";
import { fieldErrorsFrom } from "@/lib/api/field-errors";

/**
 * Sign-in form.
 *
 * Deliberately says nothing about *why* a sign-in failed. The backend answers
 * a uniform `INVALID_CREDENTIALS` for both a wrong password and an unknown
 * email so the form cannot be used to discover which addresses have accounts,
 * and echoing a more "helpful" message here would give that away again.
 */
export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const { login } = useAuthActions();
  const { isAuthenticated, isLoading, homePath } = useAuth();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { email: "", password: "" },
  });

  // Someone already signed in has no business on this page — send them on.
  // `isLoading` guards the first paint, when we do not yet know either way.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(safeRedirect(next, homePath));
    }
  }, [isLoading, isAuthenticated, homePath, next, router]);

  const onSubmit = handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: ({ user }) => {
        router.replace(safeRedirect(next, roleHomePath[user.role]));
        // Re-render server components so any authed chrome picks up the session.
        router.refresh();
      },
      onError: (error) => {
        // Map field-level details onto the inputs; anything else stays in the
        // Alert above the form.
        for (const { field, message } of fieldErrorsFrom(error)) {
          if (field === "email" || field === "password") {
            setError(field, { message });
          }
        }
      },
    });
  });

  return (
    <>
      <AuthHeading title="Welcome back">
        Sign in to manage your listings, inspections, and saved homes.
      </AuthHeading>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {login.isError && (
          <Alert tone="danger" title="Couldn't sign you in">
            {login.error.message}
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
              leading={<Mail aria-hidden="true" className="size-4" />}
            />
          )}
        </FormField>

        <FormField label="Password" required error={errors.password?.message}>
          {(field) => (
            <PasswordInput
              {...field}
              {...register("password")}
              autoComplete="current-password"
              placeholder="Your password"
            />
          )}
        </FormField>

        <div className="-mt-1 flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand-700 underline-offset-4 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          block
          isLoading={login.isPending}
          loadingText="Signing in…"
        >
          <LogIn aria-hidden="true" className="size-4" />
          Sign in
        </Button>
      </form>

      <AuthFooterLink
        prompt="New to WALE?"
        href={next ? `/register?next=${encodeURIComponent(next)}` : "/register"}
        label="Create an account"
      />
    </>
  );
}
