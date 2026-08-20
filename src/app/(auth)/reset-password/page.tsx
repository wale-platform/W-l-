import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
  description: "Choose a new password for your WALE Housing account.",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * The reset token arrives as `?token=…`.
 *
 * Read on the server and handed down as a prop rather than pulled from
 * `useSearchParams()` in the client: that hook forces the tree up to the
 * nearest Suspense boundary to render client-side, and a static build fails
 * outright without one.
 */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return <ResetPasswordForm token={first(params?.token) ?? ""} />;
}
