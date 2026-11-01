import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Flag,
  Home,
  HelpCircle,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";
import { ContactForm } from "@/components/marketing/ContactForm";
import { siteConfig } from "@/config/site";
import { isContactTopic } from "@/lib/api/schemas";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with the WALE team in Ilorin. We reply within one working day to questions about listings, verification, your account, or listing a property.",
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
    href: `tel:${siteConfig.contact.phone.replace(/\s/g, "")}`,
  },
  {
    icon: MapPin,
    label: "Our office",
    value: siteConfig.contact.address,
    href: null,
  },
];

const shortcuts = [
  {
    icon: Flag,
    title: "Report a listing",
    description: "Something looks wrong with a home or a landlord? Tell us and we'll check it.",
    href: "/contact?topic=report#message",
  },
  {
    icon: Home,
    title: "List your property",
    description: "Create a landlord account to upload photos and details for students to find.",
    href: "/signup",
  },
  {
    icon: HelpCircle,
    title: "Read the FAQ",
    description: "Answers about verification, inspections, payments and accounts.",
    href: "/faq",
  },
];

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const { topic } = await searchParams;
  const initialTopic = isContactTopic(topic) ? topic : "general";

  return (
    <>
      <section className="bg-gradient-to-br from-[#fff8fb] via-white to-[#f7eaf0]">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-800">
            Contact
          </p>
          <h1 className="mt-3 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-4xl lg:text-5xl">
            We&apos;re here to help with your next move.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-ink-600 sm:text-base">
            Questions about a listing, help with your account, or wondering how
            verification works? Send us a message and a member of the WALE team
            will reply within one working day.
          </p>
        </div>
      </section>

      <section className="py-10 sm:py-14">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-10">
          <div className="flex flex-col gap-6">
            <ul className="grid gap-3">
              {contactMethods.map((method) => (
                <li
                  key={method.label}
                  className="flex items-start gap-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-800">
                    <method.icon aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink-900">{method.label}</p>
                    {method.href ? (
                      <a
                        href={method.href}
                        className="mt-0.5 block break-words text-sm text-brand-800 hover:underline"
                      >
                        {method.value}
                      </a>
                    ) : (
                      <p className="mt-0.5 text-sm text-ink-600">{method.value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/50 p-5">
              <Clock aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-800" />
              <p className="text-sm leading-6 text-ink-700">
                <span className="font-bold text-ink-900">Reply within one working day.</span>{" "}
                We read every message. Reports about unsafe listings or
                suspected fraud are looked at first.
              </p>
            </div>

            <div>
              <h2 className="text-base font-bold text-ink-900">Looking for something specific?</h2>
              <ul className="mt-3 grid gap-3">
                {shortcuts.map((shortcut) => (
                  <li key={shortcut.title}>
                    <Link
                      href={shortcut.href}
                      className="group flex items-start gap-3 rounded-xl border border-ink-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40"
                    >
                      <shortcut.icon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-brand-800" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-ink-900">{shortcut.title}</span>
                        <span className="mt-0.5 block text-xs leading-5 text-ink-600">{shortcut.description}</span>
                      </span>
                      <ArrowRight
                        aria-hidden="true"
                        className="mt-0.5 size-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-800"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div
            id="message"
            className="scroll-mt-24 rounded-3xl border border-ink-200 bg-white p-5 shadow-card sm:p-8"
          >
            <h2 className="text-xl font-bold tracking-tight text-ink-900 sm:text-2xl">
              Send us a message
            </h2>
            <p className="mb-6 mt-1 text-sm text-ink-600">
              Fields marked with an asterisk are required.
            </p>
            {/* Keyed so following a ?topic= link while on the page resets the form. */}
            <ContactForm key={initialTopic} initialTopic={initialTopic} />
          </div>
        </div>
      </section>
    </>
  );
}
