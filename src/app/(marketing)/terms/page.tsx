import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/marketing/LegalPage";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of WALE Housing — what we verify, what we do not, and the rules for students, landlords, and agents on the platform.",
};

const sections: LegalSection[] = [
  {
    heading: "Who these terms are between",
    body: (
      <>
        <p>
          WALE Housing (&ldquo;WALE&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
          operates a platform that lists student accommodation near Nigerian
          universities. These terms form an agreement between you and WALE
          covering your use of {siteConfig.url} and any service we provide
          through it.
        </p>
        <p>
          By creating an account, browsing listings, or requesting an
          inspection, you accept these terms. If you do not accept them, do not
          use the platform.
        </p>
      </>
    ),
  },
  {
    heading: "What WALE is, and what it is not",
    body: (
      <>
        <p>
          WALE is a search and inspection platform. We publish listings, verify
          a portion of them, and pass your inspection requests to the landlord
          or agent responsible for the property.
        </p>
        <p>
          We are not a landlord, an estate agent, or a party to any tenancy. We
          do not own, manage, let, or hold keys to any property on the
          platform. Any tenancy agreement you enter is between you and the
          landlord directly, and we are not a party to it.
        </p>
        <p>
          We also do not currently handle rent, deposits, or agency fees. Money
          never moves through WALE.
        </p>
      </>
    ),
  },
  {
    heading: "Your account",
    body: (
      <>
        <p>
          You need an account to save listings and request inspections. You
          agree to give accurate details, keep your password to yourself, and
          tell us promptly if you think someone else has got into your account.
        </p>
        <p>
          You are responsible for activity under your account. Accounts are
          personal — do not share, sell, or transfer one.
        </p>
        <p>
          You must be at least 18, or have the consent of a parent or guardian
          who accepts these terms on your behalf.
        </p>
      </>
    ),
  },
  {
    heading: "What the verified badge means",
    body: (
      <>
        <p>
          A verified badge means a WALE agent has physically visited the
          property within the last 60 days and confirmed three things: the
          address exists, the person named in the listing controls it, and the
          price and availability date shown were current at the time of the
          visit.
        </p>
        <p>
          It is not a warranty about the condition, safety, legality, or
          suitability of the property, and it is not a promise that the details
          are still accurate today. Circumstances change between visits.
          Listings without the badge have not been visited by us at all — the
          details there come from the landlord or agent.
        </p>
        <p>
          Inspect any property yourself before you commit money to it. Read our{" "}
          <Link href="/faq" className="text-brand-700 hover:underline">
            FAQ
          </Link>{" "}
          for how verification works in practice.
        </p>
      </>
    ),
  },
  {
    heading: "Listing information and pricing",
    body: (
      <>
        <p>
          Listing content — photographs, descriptions, amenities, rent, and
          availability — is supplied by landlords and agents. We check what we
          can and require them to honour the published rent, but we cannot
          guarantee that every detail is complete or current.
        </p>
        <p>
          If a landlord or agent quotes you more than the rent we published,
          tell us. We will remove the listing and refund their fee.
        </p>
      </>
    ),
  },
  {
    heading: "Inspections",
    body: (
      <>
        <p>
          When you request an inspection we forward your contact details and
          preferred times to the landlord or agent. They arrange the visit with
          you directly. A WALE representative does not attend unless you ask us
          to and we agree.
        </p>
        <p>
          Never pay money before you have seen a property. Anyone on WALE who
          asks you to is breaking our rules — report them through the{" "}
          <Link href="/contact" className="text-brand-700 hover:underline">
            contact form
          </Link>{" "}
          and we will remove them.
        </p>
      </>
    ),
  },
  {
    heading: "Landlord and agent obligations",
    body: (
      <>
        <p>
          If you are a landlord or agent with a listing on WALE, you agree to
          the following:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You will honour the price you published — no quoting a higher rent
            once a student makes contact.
          </li>
          <li>
            You will keep your availability dates up to date. If a property is
            no longer available, take the listing down within 48 hours.
          </li>
          <li>
            You will not ask for any payment before the applicant has inspected
            the property.
          </li>
          <li>
            You will provide accurate photographs and descriptions of the
            property as it actually is — not a different unit, not a staged
            room that is never available.
          </li>
          <li>
            The local verification agent must be permitted to enter the
            property for verification visits during reasonable hours.
          </li>
        </ul>
        <p>
          Listings or accounts that break these rules will be removed, and
          listing fees will not be refunded.
        </p>
      </>
    ),
  },
  {
    heading: "Content you submit",
    body: (
      <>
        <p>
          When you send us a message, create an account, or post a review, you
          grant us a licence to use, reproduce, and display that content in
          the course of running the platform.
        </p>
        <p>
          Do not post anything unlawful, defamatory, fraudulent, or that
          invades someone else&apos;s privacy. We may take content down at our
          discretion, though we are not obliged to monitor everything users
          submit.
        </p>
      </>
    ),
  },
  {
    heading: "Intellectual property",
    body: (
      <>
        <p>
          The WALE name, logo, and the shape and structure of the platform
          belong to us. Listing photographs remain the property of whoever
          took them (usually the landlord or agent). You may link to any
          public page on the platform.
        </p>
        <p>
          Do not scrape the platform or resell our data. If you want access to
          listings data for a legitimate purpose, get in touch — we may have a
          paid data product later.
        </p>
      </>
    ),
  },
  {
    heading: "Availability and changes",
    body: (
      <>
        <p>
          WALE is a new platform under active development. We make no promise
          about uptime, though we work hard to keep the service running.
        </p>
        <p>
          We may change these terms by posting a revision and updating the
          &ldquo;Last updated&rdquo; date. Significant changes come with a
          notice on the platform or an email to account holders. Your
          continued use after the change means you accept the updated terms.
        </p>
      </>
    ),
  },
  {
    heading: "Limitation of liability",
    body: (
      <>
        <p>
          WALE is provided on an &ldquo;as is&rdquo; and &ldquo;as
          available&rdquo; basis. To the fullest extent allowed by Nigerian
          law, we disclaim all warranties, both express and implied, regarding
          the accuracy or completeness of listing information.
        </p>
        <p>
          WALE shall not be liable for any loss, damage, or dispute arising
          from a tenancy, a listing, or information published on the platform,
          except where such liability cannot be excluded by law.
        </p>
      </>
    ),
  },
  {
    heading: "Governing law and dispute resolution",
    body: (
      <>
        <p>
          These terms are governed by the laws of the Federal Republic of
          Nigeria.
        </p>
        <p>
          Before taking any formal action, you agree to attempt to resolve a
          dispute with us informally — send us an email at{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-brand-700 hover:underline"
          >
            {siteConfig.contact.email}
          </a>{" "}
          and give us 14 days to respond.
        </p>
        <p>
          If informal resolution does not work, disputes fall under the
          exclusive jurisdiction of the courts of Lagos State, Nigeria.
        </p>
      </>
    ),
  },
  {
    heading: "Contact",
    body: (
      <>
        <p>
          Questions about these terms should be sent to{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-brand-700 hover:underline"
          >
            {siteConfig.contact.email}
          </a>
          {" "}or through the{" "}
          <Link href="/contact" className="text-brand-700 hover:underline">
            contact form
          </Link>.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      updated="1 August 2026"
      intro="These terms explain what you can expect from WALE, what we expect from you, and where our responsibility ends and a landlord's begins. Please read them before you use the platform."
      sections={sections}
    />
  );
}
