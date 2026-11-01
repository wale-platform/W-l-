"use client";

import Link from "next/link";
import {
  ArrowRight,
  Eye,
  GraduationCap,
  Home,
  MapPin,
  MessagesSquare,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { ShowcaseCollage } from "@/components/auth/AuthShowcase";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { Button } from "@/components/ui";
import { FeaturedListings } from "@/components/marketing/FeaturedListings";
import { HeroSearch } from "@/components/marketing/HeroSearch";
import { universities } from "@/config/site";

const homeHighlights = [
  {
    icon: Search,
    title: "Start with your area",
    description: "Search by location or university.",
  },
  {
    icon: Sparkles,
    title: "Make it personal",
    description: "Match homes to your preferences.",
  },
  {
    icon: MapPin,
    title: "See the surroundings",
    description: "Explore homes and routes on the map.",
  },
];

const homeTools = [
  {
    icon: Sparkles,
    title: "A shortlist that fits you",
    description:
      "Tell AI Match what matters: your budget, preferred area, home type, and must-haves. It ranks listings against the preferences you choose.",
    link: "/match",
    linkLabel: "Build your match",
  },
  {
    icon: MapPin,
    title: "Explore the area, not just the listing",
    description:
      "Search a postcode, neighbourhood, or city, compare nearby homes, and request on-map driving directions to a place you want to visit.",
    link: "/map",
    linkLabel: "Explore homes on the map",
  },
  {
    icon: Eye,
    title: "Compare the details that matter",
    description:
      "Review property photos, rent, availability, amenities, and listing source before choosing what to explore next.",
    link: "/properties",
    linkLabel: "See home listings",
  },
];

const communityTypes = [
  {
    icon: GraduationCap,
    title: "Students",
    description:
      "Look for a place near campus, compare rents, and see what is available for your move.",
  },
  {
    icon: Users,
    title: "Tenants",
    description:
      "Search by the neighbourhood, budget, and home features that fit your day-to-day life.",
  },
  {
    icon: Home,
    title: "Landlords",
    description:
      "Share property details with people actively exploring homes in your area.",
  },
  {
    icon: Scale,
    title: "Property lawyers",
    description:
      "Be part of a housing process built around clearer listings and accountable connections.",
  },
];

const journeySteps = [
  {
    number: "01",
    icon: Search,
    title: "Search",
    description:
      "Choose an area or university, set a budget, and filter for the kind of home you need.",
  },
  {
    number: "02",
    icon: Eye,
    title: "Compare",
    description:
      "Look through photos, rent, availability, amenities, and who listed each home.",
  },
  {
    number: "03",
    icon: MessagesSquare,
    title: "Take the next step",
    description:
      "Open a listing to learn more, then arrange a conversation or inspection when you are ready.",
  },
];

export default function HomePage() {
  return (
    <SiteChrome>
      <div className="bg-white text-ink-900">
        <section className="relative isolate overflow-hidden bg-gradient-to-br from-[#fff8fb] via-[#fdf1f5] to-[#f7e3eb]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(55%_50%_at_15%_10%,rgba(255,255,255,0.95),transparent_70%),radial-gradient(50%_45%_at_90%_85%,rgba(122,23,55,0.12),transparent_70%)]"
          />
          <div className="mx-auto grid max-w-7xl items-center gap-6 px-5 py-8 sm:px-8 sm:py-10 md:grid-cols-[1.05fr_0.95fr] md:gap-10 md:py-14">
            <div>
              <p className="w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-brand-800 shadow-sm">
                Homes, without hassle
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                Find your home with <span className="text-brand-800">no hassle.</span>
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-ink-600 sm:text-base">
                Finding a place should feel clear, not like guesswork. Explore
                homes near your campus or neighbourhood, compare the details,
                and use practical tools to decide what fits your next move.
              </p>

              <div className="mt-5 max-w-2xl">
                <HeroSearch />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
                <Link href="/match" className="text-brand-800 hover:underline">
                  Try AI Match
                </Link>
                <Link href="/map" className="text-brand-800 hover:underline">
                  Search on the map
                </Link>
                <Link href="/signup" className="text-ink-600 hover:underline">
                  Create a free account
                </Link>
              </div>
              <ul className="mt-6 grid gap-3 sm:grid-cols-3">
                {homeHighlights.map((highlight) => (
                  <li
                    key={highlight.title}
                    className="flex items-start gap-2.5 rounded-xl border border-brand-100 bg-white/80 p-3"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-800">
                      <highlight.icon aria-hidden="true" className="size-5" />
                    </span>
                    <span>
                      <span className="block text-xs font-bold text-ink-900">
                        {highlight.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-4 text-ink-600">
                        {highlight.description}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card-and-sticker collage, matching the sign-in pages. */}
            <div className="relative mx-auto w-full max-w-[520px] px-6 py-8 sm:px-10 md:px-2 md:py-4">
              <ShowcaseCollage />
            </div>
          </div>
        </section>

        <section
          aria-labelledby="featured-homes-title"
          className="py-10 sm:py-14"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                  A first look
                </p>
                <h2
                  id="featured-homes-title"
                  className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  Explore homes and compare your options
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-600">
                  Browse photos, locations, rent, and key details to help you
                  decide which homes are worth a closer look.
                </p>
              </div>
              <Link
                href="/properties"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
              >
                Browse all homes
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <FeaturedListings limit={6} />
          </div>
        </section>

        <section
          aria-labelledby="wale-tools-title"
          className="border-y border-ink-100 bg-gradient-to-br from-ink-50/80 via-white to-brand-50/50 py-10 sm:py-14"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-6 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                Tools for your search
              </p>
              <h2
                id="wale-tools-title"
                className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Search your way, with more confidence
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-600 sm:text-base">
                Start with a regular search, get a preference-based shortlist,
                or explore homes around a specific place.
              </p>
            </div>
            <ul className="grid gap-4 md:grid-cols-3">
              {homeTools.map((tool) => (
                <li key={tool.title}>
                  <article className="flex h-full flex-col rounded-2xl border border-ink-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-card sm:p-6">
                    <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-50 to-brand-100/70 text-brand-800">
                      <tool.icon aria-hidden="true" className="size-8" />
                    </span>
                    <h3 className="text-base font-bold text-ink-900 sm:text-lg">
                      {tool.title}
                    </h3>
                    <p className="mt-2 flex-1 text-sm leading-6 text-ink-600">
                      {tool.description}
                    </p>
                    <Link
                      href={tool.link}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
                    >
                      {tool.linkLabel}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="wale-community-title"
          className="py-10 sm:py-14"
        >
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div className="lg:sticky lg:top-24">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                More than a listing page
              </p>
              <h2
                id="wale-community-title"
                className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                One platform for every side of the move
              </h2>
              <p className="mt-3 text-sm leading-6 text-ink-600 sm:text-base">
                Whether you are finding a place, sharing a home, or helping
                someone navigate a property decision, WALE brings useful
                information and clearer next steps into one place.
              </p>
              <Link
                href="/about"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
              >
                Learn about WALE
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {communityTypes.map((community) => (
                <li
                  key={community.title}
                  className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <span className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
                    <community.icon aria-hidden="true" className="size-8" />
                  </span>
                  <h3 className="text-base font-bold text-ink-900">
                    {community.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    {community.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="wale-steps-title"
          className="border-y border-ink-100 bg-ink-50/50 py-10 sm:py-14"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-6 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                How WALE works
              </p>
              <h2
                id="wale-steps-title"
                className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                From search to your next move
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                Take the search one step at a time. You choose what to compare
                and when you are ready to reach out.
              </p>
            </div>
            <ol className="grid gap-4 md:grid-cols-3">
              {journeySteps.map((step) => (
                <li
                  key={step.number}
                  className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
                      <step.icon aria-hidden="true" className="size-8" />
                    </span>
                    <span className="text-3xl font-extrabold tracking-tight text-brand-100">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-ink-600">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="wale-coverage-title"
          className="bg-gradient-to-r from-[#fff8fb] via-white to-[#f7eaf0] py-10 sm:py-14"
        >
          <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                Start close to what matters
              </p>
              <h2
                id="wale-coverage-title"
                className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Housing near Nigerian universities
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                Browse university areas and see homes connected to the places
                where you study, work, or spend your time.
              </p>
              <Link
                href="/properties"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline"
              >
                Find a university area
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {universities.map((university) => (
                <li key={university.id}>
                  <Link
                    href={`/properties?university=${university.id}`}
                    className="group flex h-full items-center gap-3 rounded-xl border border-brand-100 bg-white/90 p-3.5 shadow-sm transition-colors hover:border-brand-300 hover:bg-white"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                      <MapPin aria-hidden="true" className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-brand-800">
                        {university.short}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-ink-900">
                        {university.name}
                      </span>
                    </span>
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-800"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="join"
          aria-labelledby="join-title"
          className="scroll-mt-20 border-t border-ink-100 bg-ink-50/60 py-10 sm:py-14"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-card lg:grid-cols-[0.9fr_1.1fr]">
              <div className="relative isolate flex min-h-64 flex-col justify-between overflow-hidden bg-brand-950 p-6 text-white sm:p-8 lg:p-10">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_70%_at_0%_0%,rgba(122,23,55,0.7),transparent_70%)]"
                />
                <div>
                  <span className="mb-5 flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-brand-100">
                    <ShieldCheck aria-hidden="true" className="size-9" />
                  </span>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-100">
                    Join WALE
                  </p>
                  <h2
                    id="join-title"
                    className="mt-2 max-w-md text-2xl font-extrabold tracking-tight sm:text-3xl"
                  >
                    Make your next home search a clearer one.
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-6 text-white/75">
                    Create a free account to request inspections, save your
                    preferences, or list a property for students and tenants.
                  </p>
                </div>
                <ul className="mt-8 grid gap-3 text-sm text-white/90 sm:grid-cols-2 lg:grid-cols-1">
                  {[
                    "Verified listings near your campus",
                    "Direct contact with landlords and owners",
                  ].map((benefit) => (
                    <li key={benefit} className="flex items-center gap-2">
                      <ShieldCheck
                        aria-hidden="true"
                        className="size-4 shrink-0 text-brand-200"
                      />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
                <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                  Get started in a minute
                </h3>
                <p className="mt-1 text-sm leading-6 text-ink-600">
                  Choose how you&apos;ll use WALE when you sign up.
                </p>
                <ul className="mt-5 grid grid-cols-2 gap-2">
                  {communityTypes.map((community) => (
                    <li
                      key={community.title}
                      className="flex items-center gap-2 rounded-xl border border-ink-200 px-3 py-2.5 text-sm font-semibold text-ink-800"
                    >
                      <community.icon aria-hidden="true" className="size-4 shrink-0 text-brand-800" />
                      {community.title}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link href="/signup" className="sm:w-auto">
                    <Button size="lg" block>
                      Create an account
                    </Button>
                  </Link>
                  <Link href="/login" className="sm:w-auto">
                    <Button size="lg" tone="outline" block>
                      Log in
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </SiteChrome>
  );
}
