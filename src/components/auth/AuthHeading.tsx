import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Heading block shared by every auth page, so the five pages stay visually
 * identical above the form and only the copy changes.
 */
export function AuthHeading({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-[1.75rem]">
        {title}
      </h1>
      {children && (
        <p className="mt-2 text-pretty text-sm leading-relaxed text-ink-600">
          {children}
        </p>
      )}
    </div>
  );
}

/** The "already have an account?" line under an auth form. */
export function AuthFooterLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="mt-8 text-center text-sm text-ink-600">
      {prompt}{" "}
      <Link
        href={href}
        className="font-semibold text-brand-700 underline-offset-4 hover:underline"
      >
        {label}
      </Link>
    </p>
  );
}

/**
 * Reduce a `?next=` value to one that is safe to navigate to, or nothing.
 *
 * A `?next=` value comes from the URL, so it is attacker-controlled. Without
 * this check `/login?next=https://evil.example` would hand a freshly
 * authenticated user straight to a phishing page wearing our flow as cover.
 * Protocol-relative `//host` is rejected too — the browser treats it as
 * absolute.
 *
 * Server pages call this when they read `searchParams`, so a hostile value is
 * dropped at the boundary and never reaches the tree. That matters beyond the
 * redirect itself: the forms thread `next` into their "create an account" /
 * "sign in instead" links, and a value that got that far would be echoed into
 * an `href` and carried on to the next page.
 */
export function sanitizeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/") || next.startsWith("//")) return undefined;
  // Backslashes are normalized to forward slashes by some browsers, so
  // `/\evil.example` can escape the origin too.
  if (next.includes("\\")) return undefined;
  return next;
}

/**
 * Where to send someone after a successful auth, falling back when `next` is
 * absent or untrustworthy. Kept as the single call site for redirects so a
 * component can never navigate to a raw `next` by accident.
 */
export function safeRedirect(next: string | undefined, fallback: string): string {
  return sanitizeNext(next) ?? fallback;
}
