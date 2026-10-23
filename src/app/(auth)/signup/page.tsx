"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, type KeyboardEvent } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { signUpFormSchema, type SignUpFormData } from "@/lib/api/schemas";
import { authApi } from "@/lib/api/auth";
import { startGoogleSession } from "@/lib/auth/client-session";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import type { AuthUser } from "@/lib/api/auth";
import {
  Button,
  FormField,
  Input,
  PasswordInput,
  Alert,
  toast,
} from "@/components/ui";

type AccountRole = NonNullable<z.input<typeof signUpFormSchema>["role"]>;

const accountRoles: { value: AccountRole; label: string; description: string }[] = [
  { value: "student", label: "Student", description: "Find a place to live" },
  { value: "landlord", label: "Landlord", description: "List your property" },
  { value: "lawyer", label: "Property lawyer", description: "Offer legal support" },
  { value: "tenant", label: "Outgoing tenant", description: "Find your next tenant" },
];

export default function SignUpPage() {
  const router = useRouter();
  const roleOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const handleGoogleAuth = useCallback(
    (user: AuthUser) => {
      try {
        const destination = startGoogleSession(user);
        toast.success("Account ready", { description: `Welcome to WALE, ${user.fullName}.` });
        router.push(destination);
      } catch (error) {
        toast.error("Sign-up failed", {
          description: error instanceof Error ? error.message : "Your account could not be saved.",
        });
      }
    },
    [router],
  );

  const {
    control,
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof signUpFormSchema>, unknown, SignUpFormData>({
    resolver: zodResolver(signUpFormSchema),
    mode: "onBlur",
    defaultValues: { role: "student" },
  });
  const selectedRole = useWatch({ control, name: "role" }) ?? "student";

  const selectRole = (role: AccountRole) => {
    setValue("role", role, { shouldDirty: true, shouldValidate: true });
  };

  const handleRoleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    const keyDirections: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    let nextIndex: number;

    if (event.key in keyDirections) {
      nextIndex =
        (currentIndex + keyDirections[event.key] + accountRoles.length) %
        accountRoles.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = accountRoles.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    selectRole(accountRoles[nextIndex].value);
    roleOptionRefs.current[nextIndex]?.focus();
  };

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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold tracking-wide text-brand-800">
          YOUR NEXT CHAPTER STARTS HERE
        </span>
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          Create your account
        </h1>
        <p className="text-sm leading-6 text-ink-500">
          Choose how you&apos;ll use WALE, then set up your account.
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
        className="flex flex-col gap-4"
      >
        <input type="hidden" {...register("role")} />

        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-ink-800">
            I&apos;m joining WALE as a
            <span className="ml-0.5 text-danger" aria-hidden="true">*</span>
          </legend>
          <div
            role="radiogroup"
            aria-label="Account type"
            aria-describedby={errors.role ? "account-role-error" : undefined}
            aria-invalid={Boolean(errors.role)}
            className="grid grid-cols-2 gap-2"
          >
            {accountRoles.map((role, index) => {
              const isSelected = selectedRole === role.value;
              return (
                <button
                  key={role.value}
                  ref={(element) => {
                    roleOptionRefs.current[index] = element;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => selectRole(role.value)}
                  onKeyDown={(event) => handleRoleKeyDown(event, index)}
                  className={`min-h-[76px] rounded-2xl border p-3 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                    isSelected
                      ? "border-brand-600 bg-gradient-to-br from-brand-50 to-white shadow-[0_4px_16px_rgba(20,120,75,0.10)]"
                      : "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50/50"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-900">
                      {role.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`flex size-4 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-brand-700 bg-brand-700 text-white"
                          : "border-ink-300 bg-white"
                      }`}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 16 16" fill="none" className="size-3">
                          <path
                            d="m3.5 8 3 3 6-6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-4 text-ink-500">
                    {role.description}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.role?.message && (
            <p id="account-role-error" role="alert" className="text-xs font-medium text-danger">
              {errors.role.message}
            </p>
          )}
        </fieldset>

        <div className="flex flex-col gap-3">
          <GoogleSignInButton
            onAuthenticated={handleGoogleAuth}
            buttonText="signup_with"
            accountRole={selectedRole}
            disabled={mutation.isPending}
          />
          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <span className="w-full border-t border-ink-200" />
            </div>
            <p className="relative mx-auto w-fit bg-white px-3 text-xs font-medium text-ink-400">
              or create an account with email
            </p>
          </div>
        </div>

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
