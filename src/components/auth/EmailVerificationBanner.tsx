"use client";

import { useMutation } from "@tanstack/react-query";
import { MailWarning } from "lucide-react";
import { authApi } from "@/lib/api/auth";
import { useSession } from "@/lib/auth/client-session";
import { Button, toast } from "@/components/ui";

/** Reminds signed-in users who haven't confirmed their email yet. */
export function EmailVerificationBanner() {
  const { data: user } = useSession();
  const resend = useMutation({
    mutationFn: authApi.resendVerification,
    onSuccess: ({ message }) => toast.success("Link sent", { description: message }),
    onError: (error: Error) => toast.error("Couldn't send link", { description: error.message }),
  });

  if (!user || user.emailVerified) return null;

  return (
    <div
      role="status"
      className="mb-6 flex flex-col gap-3 rounded-card border border-warning/30 bg-warning-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2.5 text-sm text-ink-800">
        <MailWarning aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-warning" />
        <span>
          Please confirm your email address. We sent a link to{" "}
          <span className="font-semibold">{user.email}</span>.
        </span>
      </p>
      <Button
        tone="outline"
        size="sm"
        onClick={() => resend.mutate()}
        isLoading={resend.isPending}
        loadingText="Sending..."
        disabled={resend.isSuccess}
      >
        {resend.isSuccess ? "Link sent" : "Resend link"}
      </Button>
    </div>
  );
}
