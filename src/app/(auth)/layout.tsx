import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { AuthShowcase } from "@/components/auth/AuthShowcase";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#fbf7f8]">
      {/* Left side - brand showcase (desktop only). Sticky, so it stays in
          view while a long form (sign-up) scrolls on the right. */}
      <div className="relative hidden w-1/2 self-start overflow-hidden bg-gradient-to-br from-[#fff8fb] via-[#fdf1f5] to-[#f7e3eb] lg:sticky lg:top-0 lg:block lg:h-screen">
        {/* Soft colour washes behind the collage */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_20%_15%,rgba(255,255,255,0.9),transparent_70%),radial-gradient(55%_45%_at_85%_80%,rgba(122,23,55,0.12),transparent_70%)]"
        />

        {/* Everything is sized to the viewport height, so the panel never scrolls. */}
        <div className="relative flex h-full flex-col overflow-hidden px-10 py-8 xl:px-14 xl:py-10">
          <Link
            href="/"
            className="inline-flex w-fit rounded-field focus-visible:outline-brand-600"
            aria-label="WALE Housing — home"
          >
            <Logo />
          </Link>

          <div className="flex min-h-0 flex-1 justify-center py-[clamp(1rem,3vh,2.5rem)]">
            <AuthShowcase />
          </div>

          <p className="text-xs text-ink-500">
            © {new Date().getFullYear()} WALE Housing. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right side - Form Container */}
      <div className="relative flex w-full flex-col justify-between overflow-hidden px-4 py-5 sm:px-8 sm:py-8 lg:w-1/2 lg:px-10 xl:px-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(122,23,55,0.08),transparent_45%),radial-gradient(ellipse_at_bottom_left,rgba(122,23,55,0.05),transparent_40%)]"
        />
        {/* Simple top bar with Back to Home button */}
        <div className="relative flex items-center justify-between lg:justify-end">
          <Link
            href="/"
            className="block rounded-field focus-visible:outline-brand-600 lg:hidden"
            aria-label="WALE Housing — home"
          >
            <Logo />
          </Link>

          <Link
            href="/"
            className="text-sm font-medium text-ink-600 hover:text-ink-900 focus-visible:outline-brand-600"
          >
            Back to homepage
          </Link>
        </div>

        {/* Auth form center content */}
        <div className="relative my-auto mx-auto w-full max-w-[520px] py-8">
          <div className="rounded-3xl border border-white/90 bg-white/95 p-5 shadow-[0_24px_80px_rgba(86,16,39,0.10)] backdrop-blur sm:p-8 xl:p-9">
            {children}
          </div>
        </div>

        {/* Simple Footer for Mobile/Tablet */}
        <div className="relative text-center lg:hidden">
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} WALE Housing. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
