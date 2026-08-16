import type { Metadata } from "next";
import { ShieldCheck, Target, Users, Heart } from "lucide-react";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { Card } from "@/components/ui";

export const metadata: Metadata = {
  title: "About WALE",
  description:
    "WALE is building a trusted, transparent housing platform for Nigerian students. Learn about our mission, values, and the problem we're solving.",
};

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
      <Section as="div" spacing="loose" className="bg-brand-500">
        <Container size="narrow">
          <div className="flex flex-col gap-6 text-center">
            <h1 className="text-4xl font-semibold tracking-tight text-brand-50 sm:text-5xl">
              Housing shouldn&apos;t mean guessing who to trust
            </h1>
            <p className="text-lg leading-8 text-brand-50/70">
              WALE exists because students in Nigeria lose money, time, and peace
              of mind to housing fraud every single session. We built the platform
              we wish had existed when we were looking.
            </p>
          </div>
        </Container>
      </Section>

      {/* ------------------------------------------------------ Problem -- */}
      <Section>
        <Container size="narrow" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="The problem"
            title="The off-campus housing market runs on trust you can't verify"
          />

          <div className="flex flex-col gap-5 text-base leading-7 text-ink-700">
            <p>
              A student looking for a room near their campus today has three
              options: rely on a friend&apos;s recommendation, find a number in a
              WhatsApp group, or deal with an agent who may or may not have access
              to the flat they&apos;re advertising.
            </p>

            <p>
              The listing might have been taken six months ago. The rent might jump
              by ₦100,000 when you call. The agent might ask for a deposit before
              you see the place, then disappear. None of this is rare — it is the
              ordinary friction of the market.
            </p>

            <p>
              Students end up paying for accommodation they never move into, or
              moving into places with problems that were never disclosed, because
              there is no reliable, structured source of verified information.
            </p>

            <p className="font-medium text-ink-900">
              WALE is that source.
            </p>
          </div>
        </Container>
      </Section>

      {/* -------------------------------------------------------- Values -- */}
      <Section spacing="tight" className="bg-brand-50/30">
        <Container size="wide" className="flex flex-col gap-14">
          <SectionHeading
            eyebrow="Our values"
            title="How we work"
            lead="These principles guide every decision we make in the product and the operations behind it."
          />

          <div className="grid gap-6 md:grid-cols-2">
            {values.map((value) => (
              <Card key={value.title} className="flex flex-col gap-4 p-6">
                <div className="flex size-11 items-center justify-center rounded-field bg-brand-100 text-brand-700">
                  <value.icon aria-hidden="true" className="size-5" />
                </div>
                <h3 className="text-lg font-semibold text-ink-900">{value.title}</h3>
                <p className="leading-7 text-ink-600">{value.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* --------------------------------------------------------- Team -- */}
      <Section>
        <Container size="narrow" className="flex flex-col gap-8">
          <SectionHeading
            eyebrow="The team"
            title="Who we are"
          />

          <div className="flex flex-col gap-5 text-base leading-7 text-ink-700">
            <p>
              WALE started as a spreadsheet one of us kept during finals, listing
              every flat we had personally seen near campus with notes on which
              agents to avoid. That spreadsheet got shared with 40 people in one
              week.
            </p>

            <p>
              Today we are a small team spread across Lagos, Ibadan, and Zaria,
              with agents on the ground in each university town we cover. Some of
              us are recent graduates who remember what it was like to search;
              others have been managing student accommodation for years and know
              where the bad actors are.
            </p>

            <p>
              We are building WALE because the housing market for Nigerian students
              deserves the same transparency and accountability that every other
              market eventually gets when technology shows up.
            </p>
          </div>
        </Container>
      </Section>
    </>
  );
}
