"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
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
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { FeaturedListings } from "@/components/marketing/FeaturedListings";
import { HeroSearch } from "@/components/marketing/HeroSearch";
import { universities } from "@/config/site";

type UserType = "student" | "tenant" | "landlord" | "lawyer";

const userTypes: { value: UserType; label: string }[] = [
  { value: "student", label: "Student" },
  { value: "tenant", label: "Tenant" },
  { value: "landlord", label: "Landlord" },
  { value: "lawyer", label: "Property lawyer" },
];

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
  const [userType, setUserType] = useState<UserType>("student");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setSubmitError("");

    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          userType,
        }),
      });
      const result: { message?: string } = await response.json();

      if (!response.ok) {
        throw new Error(result.message ?? "Please try again.");
      }

      setSubmitted(true);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "We couldn't save your details right now. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Navbar />
      <main id="main" className="bg-white text-ink-900">
        <section className="bg-gradient-to-br from-[#fff8fb] via-white to-[#f7eaf0]">
          <div className="mx-auto grid max-w-7xl items-center gap-6 px-5 py-8 sm:px-8 sm:py-10 md:grid-cols-[1.1fr_0.9fr] md:gap-10 md:py-14">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-800">
                Homes, without hassle
              </p>
              <h1 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                Find your home with no hassle.
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
                <a href="#waitlist" className="text-ink-600 hover:underline">
                  Get launch updates
                </a>
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

            <div className="group relative h-64 overflow-hidden rounded-2xl shadow-lg sm:h-80 md:h-[26rem]">
              <Image
                src="/listings/hero-apartment.jpg"
                alt="Bright modern apartment living room with an open-plan kitchen"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-950/80 via-ink-950/30 to-transparent p-5 pt-16 text-white sm:p-6 sm:pt-20">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Home aria-hidden="true" className="size-5" />
                  Make your next move feel more considered
                </p>
                <p className="mt-1 max-w-md text-xs leading-5 text-white/85 sm:text-sm">
                  Compare your options, explore the neighbourhood, and move
                  forward at your own pace.
                </p>
              </div>
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
          id="waitlist"
          aria-labelledby="waitlist-title"
          className="scroll-mt-20 border-t border-ink-100 bg-ink-50/60 py-10 sm:py-14"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            {submitted ? (
              <div className="mx-auto max-w-3xl rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-sm">
                <h2 id="waitlist-title" className="text-xl font-bold">
                  Thanks for your interest!
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-600">
                  Your details are saved. We&apos;ll keep you updated as WALE
                  gets closer to launch.
                </p>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="mt-4 text-sm font-semibold text-brand-800 underline underline-offset-4"
                >
                  Back to the form
                </button>
              </div>
            ) : (
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
                      Stay in the loop
                    </p>
                    <h2
                      id="waitlist-title"
                      className="mt-2 max-w-md text-2xl font-extrabold tracking-tight sm:text-3xl"
                    >
                      Make your next home search a clearer one.
                    </h2>
                    <p className="mt-3 max-w-md text-sm leading-6 text-white/75">
                      Join the WALE waitlist for launch news and updates as we
                      grow our housing platform across Nigeria.
                    </p>
                  </div>
                  <ul className="mt-8 grid gap-3 text-sm text-white/90 sm:grid-cols-2 lg:grid-cols-1">
                    {[
                      "Updates on new areas and homes",
                      "A first look at WALE search tools",
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

                <div className="p-5 sm:p-8 lg:p-10">
                  <div className="mb-5">
                    <h3 className="text-xl font-bold tracking-tight sm:text-2xl">
                      Get WALE launch updates
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-ink-600">
                      Tell us a little about yourself to join the waitlist.
                    </p>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {submitError && (
                      <p
                        role="alert"
                        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800"
                      >
                        {submitError}
                      </p>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="fullName"
                          className="mb-1.5 block text-sm font-semibold"
                        >
                          Full name
                        </label>
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          autoComplete="name"
                          placeholder="Your name"
                          required
                          className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="email"
                          className="mb-1.5 block text-sm font-semibold"
                        >
                          Email address
                        </label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          required
                          className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="phone"
                          className="mb-1.5 block text-sm font-semibold"
                        >
                          Phone number
                        </label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          autoComplete="tel"
                          placeholder="Your phone number"
                          required
                          className="h-11 w-full rounded-xl border border-ink-200 px-3 text-sm outline-none focus:border-brand-800 focus:ring-2 focus:ring-brand-100"
                        />
                      </div>
                      <fieldset>
                        <legend className="mb-1.5 text-sm font-semibold">
                          I am a...
                        </legend>
                        <div className="grid grid-cols-2 gap-2">
                          {userTypes.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setUserType(option.value)}
                              aria-pressed={userType === option.value}
                              className={
                                userType === option.value
                                  ? "min-h-11 rounded-xl border border-brand-800 bg-brand-50 px-2 text-xs font-semibold text-brand-800"
                                  : "min-h-11 rounded-xl border border-ink-200 bg-white px-2 text-xs font-semibold text-ink-700"
                              }
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </fieldset>
                    </div>
                    <input type="hidden" name="userType" value={userType} />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="min-h-11 w-full rounded-xl bg-brand-800 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-900 disabled:cursor-wait disabled:opacity-70 sm:w-auto"
                    >
                      {isSubmitting ? "Saving..." : "Join the waitlist"}
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
