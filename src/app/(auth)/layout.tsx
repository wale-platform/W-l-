import Link from "next/link";
import { ArrowLeft, BadgeCheck, HandCoins, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { siteConfig } from "@/config/site";

/**
 * Shell for the auth pages.
 *
 * Two panes on desktop — brand story on the left, form on the right — and a
 * single scrolling column on mobile, where the hero collapses to a compact
 * header so the form is reachable without scrolling past marketing copy.
 *
 * A route group `(auth)` rather than a path segment, so the URLs stay
 * `/login` and `/register` (which the navbar and footer already link to).
 * No Navbar/Footer here on purpose: a signup form should not offer twelve
 * competing exits.
 */

const PROOF_POINTS = [
  {
    icon: ShieldCheck,
    title: "Every listing is checked",
    body: "Our team verifies ownership and inspects the property before it goes live, so what you see is what exists.",
  },
  {
    icon: HandCoins,
    title: "No agent runaround",
    body: "Real prices up front. Book an inspection directly and skip the endless 'inspection fee' calls.",
  },
  {
    icon: BadgeCheck,
    title: "Honest reviews from real tenants",
    body: "People who actually lived there tell you what the landlord and the neighbourhood are really like.",
  },
];

export default function AuthLayout({ children }: LayoutProps<"/"> ) {
  return (
    <div className="flex min-h-full flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] xl:grid-cols-2">
      {/* ── Brand pane ─────────────────────────────────────────────────── */}
      <aside
        // Decorative storytelling. Ordered second in the DOM on mobile would
        // be nicer, but keeping the logo first matters more for orientation.
        className="relative isolate overflow-hidden bg-brand-800 px-6 py-8 text-white sm:px-10 lg:flex lg:flex-col lg:justify-between lg:px-12 lg:py-14"
      >
        {/* Soft radial wash so the flat brand colour reads less like a block. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(115%_85%_at_15%_0%,rgba(255,255,255,0.16),transparent_58%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-24 -z-10 size-[26rem] rounded-full bg-brand-600/25 blur-3xl"
        />

        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            aria-label={`${siteConfig.name} — home`}
            className="rounded-field"
          >
            <Logo tone="inverse" />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-field px-2.5 py-1.5 text-sm font-medium text-white/75 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back
          </Link>
        </div>

        {/* The full pitch is desktop-only — on a phone it would push the form
            below the fold, which is the one thing the page exists to show. */}
        <div className="mt-12 hidden max-w-md lg:block">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-200">
            {siteConfig.shortName} Housing
          </p>
          <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight xl:text-4xl">
            Find a place you can trust, from people you can check.
          </h2>
          <p className="mt-4 text-pretty text-base leading-relaxed text-white/70">
            {siteConfig.description}
          </p>

          <ul className="mt-10 flex flex-col gap-6">
            {PROOF_POINTS.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-3.5">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-field bg-white/10 text-brand-100 ring-1 ring-inset ring-white/15"
                >
                  <Icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-white/65">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-12 hidden text-xs text-white/45 lg:block">
          © {new Date().getFullYear()} {siteConfig.name}. {siteConfig.contact.address}.
        </p>
      </aside>

      {/* ── Form pane ──────────────────────────────────────────────────── */}
      <main
        id="main"
        className="flex flex-1 flex-col justify-center bg-white px-6 py-10 sm:px-10 lg:px-12 lg:py-14"
      >
        {/* Capped and centred so the form does not stretch to 900px on a
            wide monitor, which makes labels and inputs hard to associate. */}
        <div className="mx-auto w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
