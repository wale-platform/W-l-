import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  GraduationCap,
  Heart,
  Home,
  MapPin,
  Scale,
  ShieldCheck,
  Target,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui";
import { universities } from "@/config/site";

export const metadata: Metadata = {
  title: "About WALE",
  description:
    "WALE is building a trusted, transparent housing platform for Nigerian students, starting in Ilorin. Learn about our mission, values, and the problem we're solving.",
};

const promises = [
  {
    icon: BadgeCheck,
    title: "Verified on the ground",
    body: "A listing earns the WALE badge only after its address, ownership and availability are checked in person.",
  },
  {
    icon: Eye,
    title: "Everything up front",
    body: "Rent, availability date, amenities and who listed the home are shown before you ever make a call.",
  },
  {
    icon: UserCheck,
    title: "A named contact",
    body: "Every listing shows the landlord, agent or outgoing tenant behind it. No anonymous numbers.",
  },
];

const audiences = [
  {
    icon: GraduationCap,
    title: "Students",
    body: "Search near your campus, compare real prices, and request an inspection before you pay anything.",
  },
  {
    icon: Home,
    title: "Landlords",
    body: "Upload photos and details once and reach students who are actively looking in your area.",
  },
  {
    icon: Scale,
    title: "Property lawyers",
    body: "List on behalf of owners you represent and bring accountability to every handover.",
  },
  {
    icon: Users,
    title: "Outgoing tenants",
    body: "Moving out? Hand your place over to the next student instead of leaving it empty.",
  },
];

const values = [
  {
    icon: ShieldCheck,
    title: "Verification first",
    body: "Every listing is visited by a WALE agent before it carries our badge. Address, ownership, availability — all confirmed on the ground.",
  },
  {
    icon: Target,
    title: "Transparent pricing",
    body: "The rent on the card is the rent the landlord named. We publish the source, the date, and any known conditions up front.",
  },
  {
    icon: Users,
    title: "Named contacts",
    body: "You always know who you are dealing with. No anonymous numbers, no middlemen we can't identify, no agent claiming to own 50 flats.",
  },
  {
    icon: Heart,
    title: "Built for students",
    body: "We filter by university catchment, budget, and apartment type because that is how students search — not by hoping the area name was spelled right.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* -------------------------------------------------------- Hero -- */}
      <section className="bg-gradient-to-br from-[#fff8fb] via-white to-[#f7eaf0]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-5 py-10 sm:px-8 sm:py-14 md:grid-cols-[1.1fr_0.9fr] md:gap-12">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-800">
              About WALE
            </p>
            <h1 className="mt-3 max-w-xl text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
              Housing shouldn&apos;t mean guessing who to trust.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-6 text-ink-600 sm:text-base">
              Students in Nigeria lose money, time and peace of mind to housing
              fraud every session. WALE is a trusted, transparent and
              user-friendly place to find a home near campus — starting in
              Ilorin and growing across the country.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/properties">
                <Button size="lg" block>
                  Browse homes
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" tone="outline" block>
                  Create an account
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative h-64 overflow-hidden rounded-2xl shadow-lg sm:h-80 md:h-[24rem]">
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

      {/* ---------------------------------------------------- Promises -- */}
      <section aria-label="What WALE promises" className="border-b border-ink-100 py-10">
        <ul className="mx-auto grid max-w-7xl gap-4 px-5 sm:px-8 md:grid-cols-3">
          {promises.map((promise) => (
            <li key={promise.title} className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                <promise.icon aria-hidden="true" className="size-6" />
              </span>
              <span>
                <span className="block text-sm font-bold text-ink-900">{promise.title}</span>
                <span className="mt-1 block text-sm leading-6 text-ink-600">{promise.body}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ----------------------------------------------------- Problem -- */}
      <section aria-labelledby="problem-title" className="py-10 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-2 lg:gap-14">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
              The problem
            </p>
            <h2 id="problem-title" className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              The off-campus housing market runs on trust you can&apos;t verify
            </h2>
            <div className="mt-4 flex flex-col gap-4 text-sm leading-7 text-ink-700 sm:text-base">
              <p>
                A student looking for a room near campus today has three options:
                rely on a friend&apos;s recommendation, find a number in a WhatsApp
                group, or deal with an agent who may or may not have access to the
                flat they&apos;re advertising.
              </p>
              <p>
                The listing might have been taken six months ago. The rent might
                jump by ₦100,000 when you call. The agent might ask for a deposit
                before you see the place, then disappear. None of this is rare —
                it is the ordinary friction of the market.
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-brand-100 bg-brand-950 p-6 text-white sm:p-8">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-100">
              What WALE does
            </p>
            <p className="mt-3 text-xl font-bold leading-snug sm:text-2xl">
              One structured, honest source for homes near Nigerian universities.
            </p>
            <ul className="mt-6 flex flex-col gap-3 text-sm text-white/85">
              {[
                "Search by university, budget, apartment type and verification",
                "See homes and driving directions on an interactive map",
                "Let AI Match rank listings against what matters to you",
                "Request an inspection straight from the listing",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-200" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --------------------------------------------------- Audiences -- */}
      <section aria-labelledby="audiences-title" className="border-y border-ink-100 bg-ink-50/50 py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
              Who WALE is for
            </p>
            <h2 id="audiences-title" className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              Every side of the move, in one place
            </h2>
          </div>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {audiences.map((audience) => (
              <li key={audience.title} className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
                <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
                  <audience.icon aria-hidden="true" className="size-6" />
                </span>
                <h3 className="text-base font-bold text-ink-900">{audience.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-600">{audience.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------ Values -- */}
      <section aria-labelledby="values-title" className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
              Our values
            </p>
            <h2 id="values-title" className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
              How we work
            </h2>
            <p className="mt-2 text-sm leading-6 text-ink-600">
              These principles guide every decision we make in the product and
              the operations behind it.
            </p>
          </div>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {values.map((value) => (
              <li key={value.title} className="flex gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-800">
                  <value.icon aria-hidden="true" className="size-6" />
                </span>
                <span>
                  <h3 className="text-base font-bold text-ink-900">{value.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-600">{value.body}</p>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------------- Story -- */}
      <section aria-labelledby="story-title" className="border-t border-ink-100 bg-gradient-to-r from-[#fff8fb] via-white to-[#f7eaf0] py-10 sm:py-14">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
            Our story
          </p>
          <h2 id="story-title" className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            It started with a spreadsheet
          </h2>
          <div className="mt-4 flex flex-col gap-4 text-sm leading-7 text-ink-700 sm:text-base">
            <p>
              WALE started as a spreadsheet one of us kept during finals, listing
              every flat we had personally seen near campus with notes on which
              agents to avoid. That spreadsheet got shared with 40 people in one
              week.
            </p>
            <p>
              Some of us are recent graduates who remember what it was like to
              search; others have been managing student accommodation for years
              and know where the bad actors are.
            </p>
            <p className="font-medium text-ink-900">
              We are building WALE because the housing market for Nigerian
              students deserves the same transparency and accountability that
              every other market eventually gets when technology shows up.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------- Coverage -- */}
      <section aria-labelledby="coverage-title" className="py-10 sm:py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
                Where we are
              </p>
              <h2 id="coverage-title" className="mt-1 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                Homes near {universities.length} universities
              </h2>
            </div>
            <Link href="/map" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:underline">
              Explore the map
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
          <ul className="mt-6 flex flex-wrap gap-2">
            {universities.map((university) => (
              <li key={university.id}>
                <Link
                  href={`/properties?university=${university.id}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-white px-3.5 py-2 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50"
                >
                  <MapPin aria-hidden="true" className="size-4 text-brand-800" />
                  {university.short}
                  <span className="font-normal text-ink-500">· {university.city}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* --------------------------------------------------------- CTA -- */}
      <section className="pb-12 sm:pb-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col items-start justify-between gap-5 rounded-3xl bg-brand-950 p-6 text-white sm:p-10 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Ready to find your next home?
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
                Join WALE to request inspections and list properties, or talk
                to our team if you have a question first.
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link href="/signup">
                <Button size="lg" block className="bg-white text-brand-900 hover:bg-brand-50">
                  Create an account
                </Button>
              </Link>
              <Link href="/contact">
                <Button size="lg" tone="outline" block className="border-white/40 text-white hover:bg-white/10">
                  Contact us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
