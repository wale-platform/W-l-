import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/LoginForm";
import { sanitizeNext } from "@/components/auth/AuthHeading";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to WALE Housing to manage your listings, inspections, and saved homes.",
  // Auth pages have nothing to offer a search engine and shouldn't compete
  // with the marketing pages for the brand query.
  robots: { index: false, follow: false },
};

/** `?next=` carries the page the visitor was trying to reach before the guard. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  // Sanitized here rather than at redirect time, so an off-origin value is
  // never handed to the client at all — not as a prop, not in the "create an
  // account" href the form builds from it.
  return <LoginForm next={sanitizeNext(first(params?.next))} />;
}
