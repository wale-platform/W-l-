import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { sanitizeNext } from "@/components/auth/AuthHeading";

export const metadata: Metadata = {
  title: "Create an account",
  description:
    "Create a WALE Housing account to find verified homes, list a property, or share your experience of somewhere you've lived.",
  robots: { index: false, follow: false },
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // See the note in the login page: an off-origin `next` is dropped here so it
  // cannot reach the client or the "sign in instead" link.
  return <RegisterForm next={sanitizeNext(first(params?.next))} />;
}
