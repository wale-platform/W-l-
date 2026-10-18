import type { ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/brand/Logo";

const benefits = [
  "In-person verified listings near your campus",
  "Zero agent runaround or hidden viewing fees",
  "Direct communication with landlords and owners",
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left side - Brand/Marketing Pane (Hidden on Mobile/Tablet) */}
      <div className="relative hidden w-1/2 overflow-hidden bg-brand-950 lg:block">
        {/* Decorative radial gradient wash */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_80%_at_50%_40%,rgba(30,158,102,0.25),transparent_70%)]"
        />

        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          {/* Logo link back to home */}
          <div>
            <Link
              href="/"
              className="inline-flex rounded-field focus-visible:outline-white"
              aria-label="WALE Housing — home"
            >
              <Logo tone="inverse" />
            </Link>
          </div>

          {/* Value Proposition */}
          <div className="my-auto max-w-md space-y-8">
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold tracking-tight text-white xl:text-4xl">
                Spaces that inspire life.
              </h2>
              <p className="text-lg leading-relaxed text-brand-200">
                Find your home with no hassle. WALE helps Nigerian students discover and secure housing near their university.
              </p>
            </div>

            <ul className="space-y-4" role="list">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-800 text-brand-300">
                    <Check aria-hidden="true" className="size-3.5" />
                  </span>
                  <span className="text-sm font-medium text-brand-100">
                    {benefit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Footer note */}
          <div>
            <p className="text-xs text-brand-400">
              © {new Date().getFullYear()} WALE Housing. All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form Container */}
      <div className="flex w-full flex-col justify-between px-6 py-8 sm:px-12 lg:w-1/2 xl:px-20">
        {/* Simple top bar with Back to Home button */}
        <div className="flex items-center justify-between lg:justify-end">
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
        <div className="my-auto mx-auto w-full max-w-[440px] py-8">
          {children}
        </div>

        {/* Simple Footer for Mobile/Tablet */}
        <div className="text-center lg:hidden">
          <p className="text-xs text-ink-400">
            © {new Date().getFullYear()} WALE Housing. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
