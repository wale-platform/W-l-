import type { Metadata } from "next";
import { VerifyEmailPanel } from "@/components/auth/VerifyEmailPanel";

export const metadata: Metadata = {
  title: "Verify your email",
  description: "Confirm your email address to finish setting up your WALE Housing account.",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <VerifyEmailPanel token={first(params?.token)} />;
}
