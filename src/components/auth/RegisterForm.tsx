"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Phone, UserPlus } from "lucide-react";
import { useAuth, useAuthActions } from "@/hooks/useAuth";
import {
  registerSchema,
  roleHomePath,
  signupRoleCopy,
  signupRoleSchema,
  type RegisterData,
  type SignupRole,
} from "@/lib/api/schemas";
import { universities } from "@/config/site";
import {
  Alert,
  Button,
  Checkbox,
  FormField,
  Input,
  PasswordInput,
  Select,
} from "@/components/ui";
import { cn } from "@/lib/utils/cn";
import { AuthFooterLink, AuthHeading, safeRedirect } from "./AuthHeading";
import { fieldErrorsFrom } from "@/lib/api/field-errors";

/**
 * Registration form.
 *
 * The role picker offers only TENANT / LANDLORD / MOVER. LAWYER and ADMIN are
 * absent because they confer trust and power and must be granted by an
 * administrator — and the backend rejects them independently, so hiding them
 * here is presentation, not the control.
 *
 * The role chosen here is the account's PRIMARY role (it decides which
 * dashboard they land on), not a permanent label: a tenant can add "mover"
 * later from their profile without a second account.
 */

const SIGNUP_ROLES = signupRoleSchema.options;

/** Field names the server may reject, mapped to the form's own field names. */
const SERVER_FIELDS = new Set<keyof RegisterData>([
  "firstName",
  "lastName",
  "email",
  "phone",
  "password",
  "confirmPassword",
  "role",
  "university",
]);

export function RegisterForm({ next }: { next?: string }) {
  const router = useRouter();
  const { register: registerUser } = useAuthActions();
  const { isAuthenticated, isLoading, homePath } = useAuth();

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    mode: "onBlur",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      role: "TENANT",
      university: "",
    },
  });

  // `useWatch` rather than `watch("role")`: the subscription hook re-renders
  // only this component when role changes, and unlike `watch` it is safe under
  // the React Compiler's memoization.
  const selectedRole = useWatch({ control, name: "role" });

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(safeRedirect(next, homePath));
    }
  }, [isLoading, isAuthenticated, homePath, next, router]);

  const onSubmit = handleSubmit((values) => {
    registerUser.mutate(values, {
      onSuccess: ({ user }) => {
        router.replace(safeRedirect(next, roleHomePath[user.role]));
        router.refresh();
      },
      onError: (error) => {
        for (const { field, message } of fieldErrorsFrom(error)) {
          if (SERVER_FIELDS.has(field as keyof RegisterData)) {
            setError(field as keyof RegisterData, { message });
          }
        }
      },
    });
  });

  return (
    <>
      <AuthHeading title="Create your account">
        One account for finding a home, letting a property, or sharing what it
        was really like to live somewhere.
      </AuthHeading>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
        {registerUser.isError && (
          <Alert tone="danger" title="Couldn't create your account">
            {registerUser.error.message}
          </Alert>
        )}

        {/* ── Role ─────────────────────────────────────────────────────── */}
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium text-ink-800">
            What brings you to WALE?
            <span className="ml-0.5 text-danger" aria-hidden="true">
              *
            </span>
          </legend>

          <div className="flex flex-col gap-2">
            {SIGNUP_ROLES.map((role) => (
              <RoleOption
                key={role}
                role={role}
                selected={selectedRole === role}
                inputProps={register("role")}
              />
            ))}
          </div>

          {errors.role?.message && (
            <p role="alert" className="text-xs font-medium text-danger">
              {errors.role.message}
            </p>
          )}
        </fieldset>

        {/* ── Name ─────────────────────────────────────────────────────── */}
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField label="First name" required error={errors.firstName?.message}>
            {(field) => (
              <Input
                {...field}
                {...register("firstName")}
                autoComplete="given-name"
                placeholder="Amina"
              />
            )}
          </FormField>

          <FormField label="Last name" required error={errors.lastName?.message}>
            {(field) => (
              <Input
                {...field}
                {...register("lastName")}
                autoComplete="family-name"
                placeholder="Bello"
              />
            )}
          </FormField>
        </div>

        {/* ── Contact ──────────────────────────────────────────────────── */}
        <FormField label="Email address" required error={errors.email?.message}>
          {(field) => (
            <Input
              {...field}
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="amina@example.com"
              leading={<Mail aria-hidden="true" className="size-4" />}
            />
          )}
        </FormField>

        <FormField
          label="Phone number"
          required
          hint="Nigerian number — landlords and tenants reach each other on this."
          error={errors.phone?.message}
        >
          {(field) => (
            <Input
              {...field}
              {...register("phone")}
              type="tel"
              autoComplete="tel"
              placeholder="08012345678"
              leading={<Phone aria-hidden="true" className="size-4" />}
            />
          )}
        </FormField>

        {/* University only makes sense for people looking for a home near one,
            and it is optional even then — the column is nullable. */}
        {selectedRole === "TENANT" && (
          <FormField
            label="University"
            hint="Optional. Helps us show listings within reach of your campus."
            error={errors.university?.message}
          >
            {(field) => (
              <Select {...field} {...register("university")}>
                <option value="">Not studying / prefer not to say</option>
                {universities.map((uni) => (
                  <option key={uni.id} value={uni.id}>
                    {uni.name} ({uni.short})
                  </option>
                ))}
              </Select>
            )}
          </FormField>
        )}

        {/* ── Password ─────────────────────────────────────────────────── */}
        <FormField
          label="Password"
          required
          hint="At least 8 characters, with an uppercase letter, a lowercase letter, and a number."
          error={errors.password?.message}
        >
          {(field) => (
            <PasswordInput
              {...field}
              {...register("password")}
              autoComplete="new-password"
              placeholder="Create a password"
            />
          )}
        </FormField>

        <FormField
          label="Confirm password"
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

        {/* ── Terms ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start gap-2.5">
            <Checkbox
              id="acceptTerms"
              {...register("acceptTerms")}
              aria-invalid={Boolean(errors.acceptTerms) || undefined}
              className="mt-0.5"
            />
            <label htmlFor="acceptTerms" className="text-sm leading-relaxed text-ink-700">
              I agree to the{" "}
              <Link
                href="/terms"
                className="font-medium text-brand-700 underline-offset-4 hover:underline"
              >
                terms of service
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-medium text-brand-700 underline-offset-4 hover:underline"
              >
                privacy policy
              </Link>
              .
            </label>
          </div>
          {errors.acceptTerms?.message && (
            <p role="alert" className="text-xs font-medium text-danger">
              {errors.acceptTerms.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          size="lg"
          block
          isLoading={registerUser.isPending}
          loadingText="Creating your account…"
        >
          <UserPlus aria-hidden="true" className="size-4" />
          Create account
        </Button>
      </form>

      <AuthFooterLink
        prompt="Already have an account?"
        href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
        label="Sign in"
      />
    </>
  );
}

/**
 * One role choice, styled as a card but driven by a real radio input — so
 * arrow-key navigation, form submission, and screen-reader semantics all work
 * without being reimplemented.
 */
function RoleOption({
  role,
  selected,
  inputProps,
}: {
  role: SignupRole;
  selected: boolean;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}) {
  const { label, blurb } = signupRoleCopy[role];

  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-card border p-3.5 transition-colors",
        "has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-600",
        selected
          ? "border-brand-600 bg-brand-50/70 ring-1 ring-inset ring-brand-600"
          : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50/60",
      )}
    >
      <input
        type="radio"
        value={role}
        {...inputProps}
        className="mt-0.5 size-4 shrink-0 cursor-pointer border border-ink-300 accent-brand-600"
      />
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-ink-900">{label}</span>
        <span className="text-xs leading-relaxed text-ink-600">{blurb}</span>
      </span>
    </label>
  );
}
