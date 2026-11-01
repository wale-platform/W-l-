"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, type LoginData } from "@/lib/api/schemas";
import { authApi } from "@/lib/api/auth";
import { postLoginPath, useSetSessionUser } from "@/lib/auth/client-session";
import { GoogleAuthError } from "@/components/auth/GoogleAuthError";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import {
  Button,
  FormField,
  Input,
  PasswordInput,
  Checkbox,
  Alert,
  toast,
} from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const setSessionUser = useSetSessionUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
    defaultValues: { remember: true },
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setSessionUser(data.user);
      toast.success("Welcome back!", { description: data.message });
      router.push(postLoginPath(data.user));
    },
    onError: (error: Error) => {
      toast.error("Login failed", { description: error.message });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          Log in to your account
        </h1>
        <p className="text-sm text-ink-500">
          Enter your details below to access your WALE account.
        </p>
      </div>

      <Suspense fallback={null}>
        <GoogleAuthError />
      </Suspense>

      {mutation.isError && (
        <Alert tone="danger" title="Login Failed">
          {mutation.error.message}
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert tone="success" title="Success">
          Welcome back! Redirecting you to your dashboard...
        </Alert>
      )}

      <div className="flex flex-col gap-3">
        <GoogleSignInButton mode="signin" disabled={mutation.isPending} />
        <div className="relative py-1">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <span className="w-full border-t border-ink-200" />
          </div>
          <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium text-ink-400">
            or log in with email
          </p>
        </div>
      </div>

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

        <FormField label="Password" required error={errors.password?.message}>
          {(field) => (
            <PasswordInput
              {...field}
              {...register("password")}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          )}
        </FormField>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <Checkbox {...register("remember")} />
            <span className="text-sm font-medium text-ink-700">Remember me</span>
          </label>

          <Link
            href="/forgot-password"
            className="text-xs font-semibold text-brand-700 hover:text-brand-800 focus-visible:outline-brand-600"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          size="lg"
          block
          isLoading={mutation.isPending}
          loadingText="Logging in..."
          className="mt-2"
        >
          Log in
        </Button>
      </form>

      <p className="text-center text-sm text-ink-600">
        Don&apos;t have an account yet?{" "}
        <Link
          href="/signup"
          className="font-semibold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-brand-600"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}
