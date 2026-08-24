"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { signUpFormSchema, type SignUpFormData } from "@/lib/api/schemas";
import { authApi } from "@/lib/api/auth";
import {
  Button,
  FormField,
  Input,
  PasswordInput,
  Select,
  Alert,
  toast,
} from "@/components/ui";

export default function SignUpPage() {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpFormSchema),
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: authApi.signUp,
    onSuccess: () => {
      toast.success("Account created successfully!", { description: "Please log in with your email and password." });
      router.push("/login");
    },
    onError: (error: Error) => {
      toast.error("Registration failed", { description: error.message });
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          Create your account
        </h1>
        <p className="text-sm text-ink-500">
          Join WALE to save listings, set preferences, and book inspections.
        </p>
      </div>

      {mutation.isError && (
        <Alert tone="danger" title="Sign Up Failed">
          {mutation.error.message}
        </Alert>
      )}

      {mutation.isSuccess && (
        <Alert tone="success" title="Success">
          Account created successfully! Redirecting you...
        </Alert>
      )}

      <form
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className="flex flex-col gap-5"
      >
        <FormField label="Full name" required error={errors.name?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("name")}
              autoComplete="name"
              placeholder="Amina Bello"
            />
          )}
        </FormField>

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

        <FormField
          label="Phone number"
          required
          hint="Nigerian format — 08012345678 or +2348012345678."
          error={errors.phone?.message}
        >
          {(field) => (
            <Input
              {...field}
              {...register("phone")}
              type="tel"
              autoComplete="tel"
              placeholder="08012345678"
            />
          )}
        </FormField>

        <FormField label="Account Type / Role" required error={errors.role?.message}>
          {(field) => (
            <Select {...field} {...register("role")}>
              <option value="student">Student / Housing Seeker</option>
              <option value="landlord">Landlord</option>
              <option value="lawyer">Property Lawyer</option>
              <option value="tenant">Outgoing Tenant</option>
              <option value="admin">Administrator</option>
            </Select>
          )}
        </FormField>

        <FormField label="Password" required error={errors.password?.message}>
          {(field) => (
            <PasswordInput
              {...field}
              {...register("password")}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          )}
        </FormField>

        <FormField label="Confirm password" required error={errors.confirmPassword?.message}>
          {(field) => (
            <PasswordInput
              {...field}
              {...register("confirmPassword")}
              autoComplete="new-password"
              placeholder="••••••••"
            />
          )}
        </FormField>

        <Button
          type="submit"
          size="lg"
          block
          isLoading={mutation.isPending}
          loadingText="Creating account..."
          className="mt-2"
        >
          Create account
        </Button>
      </form>

      <p className="text-center text-sm text-ink-600">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-brand-700 hover:text-brand-800 hover:underline focus-visible:outline-brand-600"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
