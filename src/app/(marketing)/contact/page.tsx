import type { Metadata } from "next";
import { Mail, Phone, MapPin } from "lucide-react";
import { Container, Section, SectionHeading } from "@/components/layout/Container";
import { ContactForm } from "@/components/marketing/ContactForm";
import { Card } from "@/components/ui";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the WALE team. We reply within one working day to every inquiry about listings, verification, or the platform.",
};

const contactMethods = [
  {
    icon: Mail,
    label: "Email us",
    value: siteConfig.contact.email,
    href: `mailto:${siteConfig.contact.email}`,
  },
  {
    icon: Phone,
    label: "Call us",
    value: siteConfig.contact.phone,
    href: `tel:${siteConfig.contact.phone}`,
  },
  {
    icon: MapPin,
    label: "Our office",
    value: siteConfig.contact.address,
    href: null,
  },
];

export default function ContactPage() {
  return (
    <>
      <Section as="div" className="bg-ink-50/70">
        <Container size="narrow">
          <SectionHeading
            as="h1"
            title="Get in touch"
            lead="Questions about a listing, need help with your account, or wondering how verification works? Send us a message and we'll reply within one working day."
          />
        </Container>
      </Section>

      <Section>
        <Container size="default">
          <div className="grid gap-10 lg:grid-cols-5">
            {/* Contact methods sidebar */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div>
                <h2 className="text-lg font-semibold text-ink-900">
                  Other ways to reach us
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-600">
                  We read every message. Most inquiries get answered the same
                  day, and all within 24 hours on business days.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {contactMethods.map((method) => (
                  <Card key={method.label} className="flex items-start gap-4 p-5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-field bg-brand-50 text-brand-700">
                      <method.icon aria-hidden="true" className="size-5" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-ink-900">
                        {method.label}
                      </p>
                      {method.href ? (
                        <a
                          href={method.href}
                          className="text-sm text-brand-700 hover:text-brand-800 hover:underline"
                        >
                          {method.value}
                        </a>
                      ) : (
                        <p className="text-sm text-ink-600">{method.value}</p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-3">
              <Card className="p-6 sm:p-8">
                <h2 className="mb-6 text-xl font-semibold text-ink-900">
                  Send us a message
                </h2>
                <ContactForm />
              </Card>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
