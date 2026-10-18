"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
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
                Search by area or university. Compare homes and explore
                locations directly.
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
            </div>

            <div className="relative h-56 overflow-hidden rounded-2xl shadow-lg sm:h-72 md:h-80">
              <Image
                src="/listings/hero-apartment.jpg"
                alt="Bright modern apartment living room with an open-plan kitchen"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="featured-homes-title" className="py-8 sm:py-10">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                  Start exploring
                </p>
                <h2
                  id="featured-homes-title"
                  className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
                >
                  Homes to get you started
                </h2>
              </div>
              <Link
                href="/properties"
                className="text-sm font-semibold text-brand-800 hover:underline"
              >
                Browse all homes
              </Link>
            </div>
            <FeaturedListings limit={3} />
          </div>
        </section>

        <section
          aria-labelledby="wale-tools-title"
          className="border-y border-ink-100 bg-ink-50/50 py-8 sm:py-10"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-5 max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                A simpler way to find a home
              </p>
              <h2
                id="wale-tools-title"
                className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Search your way, with more confidence
              </h2>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-2xl border border-ink-200 bg-white p-4 sm:p-5">
                <h3 className="font-semibold">Find homes that fit</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-600">
                  Filter by location, university, rent, and home type, or use AI
                  Match to rank listings against your preferences.
                </p>
                <Link
                  href="/match"
                  className="mt-3 inline-flex text-sm font-semibold text-brand-800 hover:underline"
                >
                  Try AI Match
                </Link>
              </article>
              <article className="rounded-2xl border border-ink-200 bg-white p-4 sm:p-5">
                <h3 className="font-semibold">Explore homes on the map</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-600">
                  Search with a postcode, neighbourhood, or city and see homes
                  near the places that matter to you.
                </p>
                <Link
                  href="/map"
                  className="mt-3 inline-flex text-sm font-semibold text-brand-800 hover:underline"
                >
                  Search the map
                </Link>
              </article>
              <article className="rounded-2xl border border-ink-200 bg-white p-4 sm:p-5">
                <h3 className="font-semibold">Know what you&apos;re viewing</h3>
                <p className="mt-1.5 text-sm leading-6 text-ink-600">
                  Compare rent, availability, amenities, verification, and
                  listing source before arranging an inspection.
                </p>
                <Link
                  href="/properties"
                  className="mt-3 inline-flex text-sm font-semibold text-brand-800 hover:underline"
                >
                  Browse homes
                </Link>
              </article>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="wale-community-title"
          className="py-8 sm:py-10"
        >
          <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                Built for housing connections
              </p>
              <h2
                id="wale-community-title"
                className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                One platform for every side of the move
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                WALE brings people in the housing process together around
                clearer listings, practical tools, and more direct connections.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {[
                ["Students", "Find accommodation near campus and compare options."],
                ["Tenants", "Explore homes that suit your needs and budget."],
                ["Landlords", "Present properties to people actively looking."],
                ["Property lawyers", "Connect with housing opportunities and transactions."],
              ].map(([title, description]) => (
                <li
                  key={title}
                  className="rounded-2xl border border-ink-200 bg-white p-4"
                >
                  <h3 className="text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-ink-600">
                    {description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          aria-labelledby="wale-steps-title"
          className="border-y border-ink-100 bg-ink-50/50 py-8 sm:py-10"
        >
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mb-5">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                How WALE works
              </p>
              <h2
                id="wale-steps-title"
                className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                From search to your next move
              </h2>
            </div>
            <ol className="grid gap-3 sm:grid-cols-3">
              {[
                ["01", "Search", "Set your area, university, budget, or home type."],
                ["02", "Compare", "Review photos, rent, availability, and home details."],
                ["03", "Connect", "Choose a listing and arrange a conversation or inspection."],
              ].map(([number, title, description]) => (
                <li
                  key={number}
                  className="flex gap-3 rounded-2xl border border-ink-200 bg-white p-4"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand-800">
                    {number}
                  </span>
                  <span>
                    <span className="block text-sm font-semibold">{title}</span>
                    <span className="mt-1 block text-sm leading-5 text-ink-600">
                      {description}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          aria-labelledby="wale-coverage-title"
          className="bg-gradient-to-r from-[#fff8fb] via-white to-[#f7eaf0] py-8 sm:py-10"
        >
          <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                Where we&apos;re growing
              </p>
              <h2
                id="wale-coverage-title"
                className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl"
              >
                Housing near Nigerian universities
              </h2>
              <p className="mt-2 text-sm leading-6 text-ink-600">
                Explore student housing around our university catchments.
                Coverage grows as more homes and local partners join WALE.
              </p>
            </div>
            <ul className="flex flex-wrap gap-2">
              {universities.map((university) => (
                <li key={university.id}>
                  <Link
                    href={`/properties?university=${university.id}`}
                    className="inline-flex rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-800 transition-colors hover:bg-brand-50"
                  >
                    {university.short}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="waitlist"
          aria-labelledby="waitlist-title"
          className="scroll-mt-20 border-t border-ink-100 bg-ink-50/60 py-8 sm:py-10"
        >
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            {submitted ? (
              <div className="rounded-2xl border border-ink-200 bg-white p-6 text-center shadow-sm">
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
              <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                    Stay in the loop
                  </p>
                  <h2
                    id="waitlist-title"
                    className="mt-1 text-xl font-bold tracking-tight sm:text-2xl"
                  >
                    Get WALE launch updates
                  </h2>
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
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
