import Link from "next/link";
import {
  ShieldCheck,
  Search as SearchIcon,
  MessagesSquare,
  ArrowRight,
  GraduationCap,
  Eye,
  HandCoins,
  MapPin,
} from "lucide-react";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { HeroSearch } from "@/components/marketing/HeroSearch";
import { FeaturedListings } from "@/components/marketing/FeaturedListings";
import { Button, Card, Badge } from "@/components/ui";
import { universities } from "@/config/site";

const steps = [
  {
    icon: SearchIcon,
    title: "Search with real filters",
    body: "Filter by budget, university, apartment type, and verification status. No endless scrolling through listings that were taken months ago.",
  },
  {
    icon: Eye,
    title: "See it before you pay",
    body: "Every listing shows its source, availability date, and full amenity list up front. Request an inspection directly from the listing page.",
  },
  {
    icon: HandCoins,
    title: "Deal with the right person",
    body: "Contact details belong to the verified landlord or accredited agent. You always know who you are talking to and what they charge.",
  },
];

const trustPoints = [
  {
    icon: ShieldCheck,
    stat: "Every listing checked",
    body: "Verified listings carry our badge only after the address, ownership, and availability have been confirmed by a WALE agent on the ground.",
  },
  {
    icon: GraduationCap,
    stat: "8 universities covered",
    body: "From UNILAG to ABU Zaria, with the student catchment areas around each campus mapped street by street.",
  },
  {
    icon: MessagesSquare,
    stat: "Named contacts, always",
    body: "No anonymous numbers. Each listing names the landlord or agent responsible for it, with their contact details attached.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ------------------------------------------------------- Hero -- */}
      <Section as="div" spacing="loose" className="relative overflow-hidden bg-brand-950">
        {/* Soft radial wash, kept behind content and inert. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(30,158,102,0.28),transparent_70%)]"
        />

        <Container size="wide" className="relative">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center">
            <Badge tone="brand" className="bg-brand-800/60 text-brand-100">
              Trusted student housing across Nigeria
            </Badge>

            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Find student housing you can actually trust
            </h1>

            <p className="max-w-2xl text-lg leading-8 text-brand-100">
              WALE lists verified accommodation near Nigerian universities, with
              honest pricing, real availability dates, and a named contact for
              every home.
            </p>
          </div>

          <div className="mx-auto mt-10 max-w-3xl">
            <HeroSearch />
          </div>

          <ul className="mx-auto mt-8 flex max-w-3xl flex-wrap items-center justify-center gap-2">
            {universities.slice(0, 6).map((uni) => (
              <li key={uni.id}>
                <Link
                  href={`/properties?university=${uni.id}`}
                  className="inline-flex rounded-full border border-brand-700/70 px-3 py-1.5 text-xs font-medium text-brand-50 transition-colors hover:border-brand-500 hover:bg-brand-800/50"
                >
                  {uni.short}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* --------------------------------------------------- How it works -- */}
      <Section id="how-it-works" className="scroll-mt-20">
        <Container size="wide" className="flex flex-col gap-14">
          <SectionHeading
            eyebrow="How it works"
            title="Three steps, no guesswork"
            lead="Finding a room off campus usually means trusting a stranger with your money. We built WALE to remove that leap of faith."
          />

          <ol className="grid gap-6 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title}>
                <Card className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-field bg-brand-50 text-brand-700">
                      <step.icon aria-hidden="true" className="size-5" />
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-ink-900">{step.title}</h3>
                  <p className="text-sm leading-6 text-ink-600">{step.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </Section>

      {/* ------------------------------------------------ Featured listings -- */}
      <Section spacing="tight" className="bg-ink-50/70">
        <Container size="wide" className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Verified homes"
            title="Recently verified listings"
            lead="Each of these has been visited and confirmed by our team in the last few weeks."
          />
          <FeaturedListings />
        </Container>
      </Section>

      {/* ------------------------------------------------------- Trust -- */}
      <Section>
        <Container size="wide" className="flex flex-col gap-14">
          <SectionHeading
            eyebrow="Why WALE"
            title="Transparency is the product"
            lead="Students lose money to housing scams every session. Every decision we make in the product is aimed at that problem."
          />

          <div className="grid gap-6 md:grid-cols-3">
            {trustPoints.map((point) => (
              <Card key={point.stat} className="flex flex-col gap-3 p-6">
                <span className="flex size-10 items-center justify-center rounded-field bg-brand-50 text-950">
                  <point.icon aria-hidden="true" className="size-5" />
                </span>
                <h3 className="font-semibold text-ink-900">{point.stat}</h3>
                <p className="text-sm leading-6 text-ink-600">{point.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* -------------------------------------------------- Universities -- */}
      <Section id="universities" spacing="tight" className="scroll-mt-20 bg-ink-50/70">
        <Container size="wide" className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Coverage"
            title="Universities we cover"
            lead="Coverage means agents on the ground who can verify a listing in person — not just a list of properties someone emailed us."
          />

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {universities.map((uni) => (
              <li key={uni.id}>
                <Link
                  href={`/properties?university=${uni.id}`}
                  className="group flex h-full flex-col gap-1 rounded-card border border-ink-200 bg-white p-5 transition-colors hover:border-brand-400 hover:bg-brand-50/40"
                >
                  <span className="text-sm font-semibold text-brand-700">
                    {uni.short}
                  </span>
                  <span className="text-sm font-medium leading-snug text-ink-900">
                    {uni.name}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                    <MapPin aria-hidden="true" className="size-3.5" />
                    {uni.city}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <p className="text-center text-sm text-ink-600">
            Studying somewhere else?{" "}
            <Link href="/contact" className="font-medium text-brand-700 hover:underline">
              Tell us where
            </Link>{" "}
            — we prioritise new towns by demand.
          </p>
        </Container>
      </Section>

      {/* --------------------------------------------------------- CTA -- */}
      <Section spacing="tight">
        <Container size="wide">
          <div className="flex flex-col items-center gap-6 rounded-card bg-brand-950 px-6 py-14 text-center sm:px-14">
            <h2 className="max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Start your search for next session
            </h2>
            <p className="max-w-xl text-brand-100">
              Create a free account to save listings, set your budget and
              university, and request inspections in one place.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/register">
                <Button size="lg" className="bg-brand-600 text-white hover:bg-brand-700">
                  Create free account
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Button>
              </Link>
              <Link href="/properties">
                <Button
                  size="lg"
                  tone="outline"
                  className="border-brand-700 bg-brand-600 text-white hover:bg-brand-700 hover:border-brand-600"
                >
                  Browse listings
                </Button>
              </Link>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
