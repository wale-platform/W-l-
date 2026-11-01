import type { Metadata } from "next";
import { VerifyEmail } from "@/components/auth/VerifyEmail";

export const metadata: Metadata = {
  title: "Confirm your email",
  robots: { index: false },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
        Confirm your email
      </h1>
      <VerifyEmail token={typeof token === "string" ? token : ""} />
    </div>
  );
}
