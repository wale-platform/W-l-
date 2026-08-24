"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { loginSchema, type LoginData } from "@/lib/api/schemas";
import { authApi } from "@/lib/api/auth";
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("wale_is_logged_in", "true");
        localStorage.setItem("wale_role", data.user.role);
        localStorage.setItem("wale_user", JSON.stringify(data.user));
      }
      toast.success("Welcome back!", { description: data.message });
      
      const role = data.user.role;
      if (role === "admin") router.push("/admin");
      else if (role === "landlord") router.push("/landlord");
      else if (role === "lawyer") router.push("/lawyer");
      else if (role === "tenant") router.push("/tenant");
      else router.push("/student");
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

      {mutation.isError && (
        <Alert tone="danger" title="Login Failed">
          {mutation.error.message}
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert tone="success" title="Success">
          Welcome back! Redirecting you to the properties...
        </Alert>
      )}

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
            <Checkbox id="remember" name="remember" />
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
