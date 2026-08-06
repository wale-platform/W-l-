import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/layout/Container";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Frequently asked questions about WALE Housing — verification, pricing, inspections, and how the platform works.",
};

const faqs = [
  {
    category: "Verification",
    questions: [
      {
        q: "What does verified mean?",
        a: "A verified listing has been physically visited by a WALE agent within the last 60 days. We confirm that the address exists, the landlord or agent named in the listing controls it, and the availability date and price are current. The badge does not guarantee the property matches your expectations — only that the information we show is accurate as of the verification date.",
      },
      {
        q: "Do you verify every listing?",
        a: "We verify every listing that carries our badge. Some listings on WALE are sourced from accredited agents or landlords we know, but have not yet been visited by our team — those show the source but do not carry the verified badge. When browsing, you can filter to verified-only if you want listings we have personally confirmed.",
      },
      {
        q: "How often do you re-verify?",
        a: "We aim to re-visit every verified listing every 60 days or whenever a tenant moves out, whichever is sooner. A listing that was verified but has since gone more than 60 days without re-confirmation loses its badge until we can visit again.",
      },
    ],
  },
  {
    category: "Pricing and fees",
    questions: [
      {
        q: "Is WALE free to use?",
        a: "Browsing, searching, and requesting inspections through WALE is completely free for students. We do not charge tenants, and we do not take a cut from your rent.",
      },
      {
        q: "How do you make money?",
        a: "Landlords and agents pay a small listing fee to have their properties appear on WALE and go through verification. The fee is annual, so once a property is listed and verified, it stays on the platform for a full year or until it is rented.",
      },
      {
        q: "Are the rents accurate?",
        a: "The rent shown on the listing is the rent the landlord or agent told us, and we require them to honor it. If you request an inspection and discover the actual rent is higher than what we published, report it to us immediately — we will remove the listing and refund the landlord's fee.",
      },
    ],
  },
  {
    category: "Inspections and bookings",
    questions: [
      {
        q: "How do I book an inspection?",
        a: "Click the \"Request inspection\" button on any listing. Fill in your contact details and preferred times, and we forward your request to the landlord or agent. They typically respond within 24 hours to confirm a time. You visit the property directly with them — we do not send someone from WALE unless you ask us to.",
      },
      {
        q: "Can I pay a deposit through WALE?",
        a: "Not yet. Right now WALE is a search and inspection platform — when you are ready to pay a deposit or sign a tenancy agreement, that happens directly between you and the landlord. We plan to add escrow and digital agreements in a future release.",
      },
      {
        q: "What if the landlord asks for money before I see the place?",
        a: "Do not pay. Report the listing to us immediately through the contact form. WALE-listed landlords and agents know that asking for money before an inspection will get them removed from the platform. If someone does it anyway, we want to know.",
      },
    ],
  },
  {
    category: "Universities and coverage",
    questions: [
      {
        q: "Which universities do you cover?",
        a: "We currently cover the catchment areas around UNILAG, UI, OAU, ABU Zaria, UNN, UNIBEN, FUTA, and BUK. Coverage means we have local agents on the ground who can verify listings, not just a list of properties someone sent us. If your university is not listed, get in touch — we prioritize expansion based on demand.",
      },
      {
        q: "What does catchment area mean?",
        a: "The catchment area is the set of neighborhoods students from a university typically live in — usually within 30 minutes' transport of campus. For UNILAG, that is Akoka, Yaba, Bariga, and the surrounding area. For UI, it is Agbowo, Bodija, Sango, and nearby zones. Listings outside the catchment still appear in search results, but we flag the commute time.",
      },
    ],
  },
  {
    category: "Agents and landlords",
    questions: [
      {
        q: "Can I list my property on WALE?",
        a: "Yes. If you are a landlord with property near one of the universities we cover, or an agent with access to verified listings, get in touch through the contact form. We will send you the onboarding steps and the verification schedule. Listing fees are paid annually and cover verification visits.",
      },
      {
        q: "How do I become a WALE verification agent?",
        a: "We hire verification agents in each university town we cover. The role involves visiting properties, confirming details with landlords, photographing interiors and exteriors, and filing reports. If you are local to one of our coverage areas and interested, email us at hello@walehousing.ng with \"Verification agent\" in the subject.",
      },
    ],
  },
];

export default function FAQPage() {
  return (
    <>
      <Section as="div" className="bg-ink-50/70">
        <Container size="narrow">
          <SectionHeading
            as="h1"
            title="Frequently asked questions"
            lead="Most questions about how WALE works are answered here. If yours isn't, send us a message through the contact form."
          />
        </Container>
      </Section>

      <Section>
        <Container size="default">
          <div className="mx-auto max-w-4xl space-y-12">
            {faqs.map((section) => (
              <div key={section.category} className="space-y-6">
                <h2 className="text-xl font-semibold text-ink-900">
                  {section.category}
                </h2>

                <div className="space-y-4">
                  {section.questions.map((item, i) => (
                    <details
                      key={i}
                      className="group rounded-card border border-ink-200 bg-white transition-colors hover:border-ink-300"
                    >
                      <summary className="flex cursor-pointer select-none items-center justify-between gap-4 px-5 py-4 font-medium text-ink-900 marker:content-none [&::-webkit-details-marker]:hidden">
                        {item.q}
                        <svg
                          aria-hidden="true"
                          className="size-5 shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="m19 9-7 7-7-7"
                          />
                        </svg>
                      </summary>
                      <div className="border-t border-ink-100 px-5 py-4 text-sm leading-7 text-ink-700">
                        {item.a}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
