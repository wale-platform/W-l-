"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  FormField,
  Input,
  Alert,
  toast,
} from "@/components/ui";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: "onBlur",
  });

  const onSubmit = async (values: ForgotPasswordData) => {
    setIsPending(true);
    setErrorMsg(null);
    setIsSuccess(false);

    try {
      // Mock API call to simulate sending a reset email
      await new Promise((resolve) => setTimeout(resolve, 1200));

      if (values.email === "error@example.com") {
        throw new Error("This email is not registered with WALE.");
      }

      setIsSuccess(true);
      toast.success("Reset link sent!", {
        description: "Please check your inbox for instructions.",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Something went wrong.");
      toast.error("Couldn't send link", { description: err.message });
    } finally {
      setIsPending(false);
    }
  };

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

      {errorMsg && (
        <Alert tone="danger" title="Error">
          {errorMsg}
        </Alert>
      )}

      {isSuccess ? (
        <div className="flex flex-col gap-5">
          <Alert tone="success" title="Check your email">
            We have sent a password reset link to your email. Please check your inbox and spam folders.
          </Alert>

          <Button tone="outline" block onClick={() => setIsSuccess(false)}>
            Send link again
          </Button>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit(onSubmit)}
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
            isLoading={isPending}
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
