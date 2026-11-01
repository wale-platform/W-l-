import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Choose a new password",
  robots: { index: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2 text-center sm:text-left">
        <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
          Choose a new password
        </h1>
        <p className="text-sm text-ink-500">
          Setting a new password signs you out on every other device.
        </p>
      </div>

      <ResetPasswordForm token={typeof token === "string" ? token : ""} />

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
