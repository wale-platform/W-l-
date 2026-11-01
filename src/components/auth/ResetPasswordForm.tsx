"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "@/lib/api/auth";
import { resetPasswordSchema, type ResetPasswordData } from "@/lib/api/schemas";
import { dashboardPath, useSetSessionUser } from "@/lib/auth/client-session";
import { Alert, Button, FormField, PasswordInput, toast } from "@/components/ui";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const setSessionUser = useSetSessionUser();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordData>({
    resolver: zodResolver(resetPasswordSchema),
    mode: "onBlur",
    defaultValues: { token },
  });

  const mutation = useMutation({
    mutationFn: authApi.resetPassword,
    onSuccess: ({ user }) => {
      setSessionUser(user);
      toast.success("Password updated", { description: "You're now logged in." });
      router.push(dashboardPath(user.role));
    },
  });

  if (!token) {
    return (
      <Alert tone="danger" title="Missing reset link">
        Open the link from your reset email, or{" "}
        <Link href="/forgot-password" className="font-semibold underline">
          request a new one
        </Link>
        .
      </Alert>
    );
  }

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="flex flex-col gap-5"
    >
      {mutation.isError && (
        <Alert tone="danger" title="Couldn't reset password">
          {mutation.error.message}{" "}
          <Link href="/forgot-password" className="font-semibold underline">
            Request a new link
          </Link>
        </Alert>
      )}

      <input type="hidden" {...register("token")} />

      <FormField
        label="New password"
        required
        hint="At least 8 characters with an uppercase letter, a lowercase letter and a number."
        error={errors.password?.message}
      >
        {(field) => (
          <PasswordInput {...field} {...register("password")} autoComplete="new-password" placeholder="••••••••" />
        )}
      </FormField>

      <FormField label="Confirm new password" required error={errors.confirmPassword?.message}>
        {(field) => (
          <PasswordInput {...field} {...register("confirmPassword")} autoComplete="new-password" placeholder="••••••••" />
        )}
      </FormField>

      <Button type="submit" size="lg" block isLoading={mutation.isPending} loadingText="Saving..." className="mt-2">
        Set new password
      </Button>
    </form>
  );
}
