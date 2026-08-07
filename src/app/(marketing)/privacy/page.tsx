import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/marketing/LegalPage";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How WALE Housing collects, uses, and protects your personal data — your rights under the Nigeria Data Protection Act 2023.",
};

const sections: LegalSection[] = [
  {
    heading: "Who we are and what this policy covers",
    body: (
      <>
        <p>
          WALE Housing (&ldquo;WALE&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;)
          operates {siteConfig.url}, a student housing search and inspection
          platform. This privacy policy explains what personal data we collect,
          why we collect it, what we do with it, and your rights under the{" "}
          Nigeria Data Protection Act 2023 (&ldquo;the Act&rdquo;).
        </p>
        <p>
          It covers everyone who uses the platform — students browsing listings
          or requesting inspections, landlords and agents who list properties,
          and visitors to the public pages.
        </p>
      </>
    ),
  },
  {
    heading: "Information we collect",
    body: (
      <>
        <p>
          We collect only what we need to make the platform work. Here is what
          that is and how:
        </p>
        <ul className="space-y-4">
          <li className="flex flex-col gap-1">
            <span className="font-semibold text-ink-900">
              Account information
            </span>
            <span>
              When you create an account we ask for your name, email address,
              and university affiliation. You choose a password; we never see
              it in the clear — a hash is stored.
            </span>
          </li>
          <li className="flex flex-col gap-1">
            <span className="font-semibold text-ink-900">
              Inspection requests
            </span>
            <span>
              When you request a property inspection we collect your preferred
              dates and times, plus a phone number so the landlord can reach
              you. That data is forwarded to the landlord or agent for that
              specific listing, and to nobody else.
            </span>
          </li>
          <li className="flex flex-col gap-1">
            <span className="font-semibold text-ink-900">
              Contact form messages
            </span>
            <span>
              Messages sent through our contact form are stored in our support
              system so we can reply and keep a thread. We delete inactive
              threads after 24 months.
            </span>
          </li>
          <li className="flex flex-col gap-1">
            <span className="font-semibold text-ink-900">
              Log data
            </span>
            <span>
              Like most websites, our servers automatically record page
              requests — your IP address, the page you asked for, your browser
              type, and a timestamp. This data is kept for 30 days and used
              for diagnosing issues and keeping the platform secure.
            </span>
          </li>
          <li className="flex flex-col gap-1">
            <span className="font-semibold text-ink-900">
              Cookies
            </span>
            <span>
              We set a session cookie to keep you logged in. It is httpOnly
              and does not track you. We also set a cookie for CSRF
              protection. We do not use third-party advertising cookies,
              analytics scripts that fingerprint you, or social-media pixels.
            </span>
          </li>
        </ul>
        <p>
          We do not collect sensitive personal data (biometrics, health data,
          religion, or ethnicity) and we never store payment-card details —
          because no payments flow through WALE.
        </p>
      </>
    ),
  },
  {
    heading: "How we use your information",
    body: (
      <>
        <p>We use your data for these purposes, and nothing else:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>To create and maintain your account.</li>
          <li>
            To forward inspection requests to the correct landlord or agent.
          </li>
          <li>
            To reply to questions and reports you submit through our contact
            form.
          </li>
          <li>To understand which pages and listings get the most use.</li>
          <li>
            To detect and stop abuse of the platform — for example, fake
            listings, scraping attempts, or spam submissions.
          </li>
          <li>
            To send you transactional emails: verification of your email
            address, password resets, and confirmation that your inspection
            request has been forwarded. We do not send marketing emails.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "Who we share your data with",
    body: (
      <>
        <p>
          We share data only where strictly necessary, and never sell it:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Landlords and agents.</strong> When you request an
            inspection, we share your name, phone number, and preferred
            inspection dates with the landlord or agent for the listing you
            selected. They get your details only for that listing.
          </li>
          <li>
            <strong>Service providers.</strong> Our email delivery and hosting
            providers process data on our behalf. They are bound by contract
            to use that data only for the purpose we specify.
          </li>
          <li>
            <strong>Law enforcement.</strong> We will comply with a valid
            court order or statutory demand under Nigerian law. We will also
            disclose information if we believe disclosure is necessary to
            prevent harm, fraud, or criminal activity on the platform.
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "Where your data is stored and for how long",
    body: (
      <>
        <p>
          Data is stored on servers located in Nigeria and, in some cases,
          within the European Economic Area through our hosting provider. In
          both locations, it is protected by appropriate technical and
          organisational measures.
        </p>
        <p>We keep your data only as long as it has a purpose:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Account data — for as long as your account is active, plus 90
            days after you delete it (so we can resolve any outstanding
            issues).
          </li>
          <li>
            Inspection request records — 12 months from the request date.
          </li>
          <li>Contact form threads — 24 months from the last message.</li>
          <li>Server logs — 30 days, rotated automatically.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "Your rights under the Nigeria Data Protection Act 2023",
    body: (
      <>
        <p>
          The Act gives you the following rights over your personal data. To
          exercise any of them, email us at{" "}
          <a
            href={`mailto:${siteConfig.contact.email}`}
            className="text-brand-700 hover:underline"
          >
            {siteConfig.contact.email}
          </a>{" "}
          with the subject &ldquo;Data request&rdquo;. We will respond within
          30 days as required by the Act.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Right of access.</strong> You can ask for a copy of the
            personal data we hold about you.
          </li>
          <li>
            <strong>Right to rectification.</strong> If your data is wrong or
            incomplete, you can ask us to fix it.
          </li>
          <li>
            <strong>Right to erasure.</strong> You can ask us to delete your
            data when we no longer need it, subject to any legal obligations
            that require us to keep it.
          </li>
          <li>
            <strong>Right to restrict processing.</strong> You can ask us to
            stop processing your data while a dispute about its accuracy or
            lawfulness is resolved.
          </li>
          <li>
            <strong>Right to data portability.</strong> You can ask us to give
            you your data, or send it to another controller, in a structured,
            machine-readable format.
          </li>
          <li>
            <strong>Right to object.</strong> You can object to processing
            based on our legitimate interests.
          </li>
          <li>
            <strong>Right to complain.</strong> If you believe we have not
            handled your data properly, you may lodge a complaint with the
            Nigeria Data Protection Commission (&ldquo;NDPC&rdquo;).
          </li>
        </ul>
      </>
    ),
  },
  {
    heading: "Security",
    body: (
      <>
        <p>
          We use industry-standard measures to protect your data: encryption
          at rest and in transit (TLS), hashed passwords, access controls that
          limit who on our team can see your personal data, and regular
          security reviews of our infrastructure.
        </p>
        <p>
          If we become aware of a data breach that is likely to result in a
          high risk to your rights, we will notify you and the NDPC within 72
          hours, as the Act requires.
        </p>
      </>
    ),
  },
  {
    heading: "Children’s privacy",
    body: (
      <>
        <p>
          WALE is intended for university students and housing seekers who are
          at least 18. We do not knowingly collect data from anyone under 18.
          If we discover that a minor has created an account without
          verifiable parental consent, we will close it and delete their data.
        </p>
      </>
    ),
  },
  {
    heading: "Changes to this policy",
    body: (
      <>
        <p>
          We will update this policy when our practices change or the law
          requires it. Significant changes come with a notice on the platform
          or an email to account holders. The &ldquo;Last updated&rdquo; date
          at the top of the page tells you which version you are reading.
        </p>
      </>
    ),
  },
  {
    heading: "Contact the data controller",
    body: (
      <>
        <p>
          The data controller is WALE Housing. Reach the person responsible
          for data protection at:
        </p>
        <address className="not-italic">
          <p>
            Data Protection Officer
            <br />
            WALE Housing
            <br />
            {siteConfig.contact.address}
            <br />
            Email:{" "}
            <a
              href={`mailto:${siteConfig.contact.email}`}
              className="text-brand-700 hover:underline"
            >
              {siteConfig.contact.email}
            </a>
          </p>
        </address>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      updated="1 August 2026"
      intro="We handle your data the way we would want ours handled — with care, for clear reasons, and never sold or shared beyond what is needed to run the platform. This policy explains exactly what that means."
      sections={sections}
    />
  );
}
