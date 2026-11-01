"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { authApi, type AuthUser } from "@/lib/api/auth";
import { changePasswordSchema, type ChangePasswordData } from "@/lib/api/schemas";
import { useSetSessionUser } from "@/lib/auth/client-session";
import { Alert, Button, FormField, PasswordInput, toast } from "@/components/ui";

/**
 * Change the password, or set one for an account created with Google
 * (`hasPassword: false`), which then can also log in with email.
 */
export function ChangePasswordForm({ user }: { user: AuthUser }) {
  const setSessionUser = useSetSessionUser();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordData>({
    resolver: zodResolver(changePasswordSchema),
    mode: "onBlur",
  });

  const mutation = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: ({ message, user: updated }) => {
      setSessionUser(updated);
      reset({ currentPassword: "", password: "", confirmPassword: "" });
      toast.success(message, { description: "Other devices have been signed out." });
    },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
      noValidate
      className="flex flex-col gap-5"
    >
      {mutation.isError && (
        <Alert tone="danger" title="Password not changed">
          {mutation.error.message}
        </Alert>
      )}

      {user.hasPassword ? (
        <FormField label="Current password" required error={errors.currentPassword?.message}>
          {(field) => (
            <PasswordInput {...field} {...register("currentPassword")} autoComplete="current-password" />
          )}
        </FormField>
      ) : (
        <p className="text-sm text-ink-600">
          You sign in with Google. Set a password to also log in with your email address.
        </p>
      )}

      <FormField
        label="New password"
        required
        hint="At least 8 characters with an uppercase letter, a lowercase letter and a number."
        error={errors.password?.message}
      >
        {(field) => <PasswordInput {...field} {...register("password")} autoComplete="new-password" />}
      </FormField>

      <FormField label="Confirm new password" required error={errors.confirmPassword?.message}>
        {(field) => <PasswordInput {...field} {...register("confirmPassword")} autoComplete="new-password" />}
      </FormField>

      <div>
        <Button type="submit" isLoading={mutation.isPending} loadingText="Saving...">
          {user.hasPassword ? "Change password" : "Set password"}
        </Button>
      </div>
    </form>
  );
}
