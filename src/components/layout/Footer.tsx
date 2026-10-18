"use client";

import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Container } from "./Container";
import { siteConfig, footerNav } from "@/config/site";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-ink-100 bg-ink-50/60">
      <Container size="wide">
        <div className="grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <Link href="/" aria-label="WALE Housing — home" className="w-fit rounded-field">
              <Logo />
            </Link>
            <p className="max-w-sm text-sm leading-6 text-ink-600">
              {siteConfig.description}
            </p>

            <ul className="flex flex-col gap-2 text-sm text-ink-600">
              <li className="flex items-center gap-2">
                <Mail aria-hidden="true" className="size-4 text-brand-600" />
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="rounded transition-colors hover:text-brand-700"
                >
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone aria-hidden="true" className="size-4 text-brand-600" />
                <a
                  href={`tel:${siteConfig.contact.phone.replace(/\s/g, "")}`}
                  className="rounded transition-colors hover:text-brand-700"
                >
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin aria-hidden="true" className="size-4 text-brand-600" />
                {siteConfig.contact.address}
              </li>
            </ul>
          </div>

          {footerNav.map((group) => (
            <nav key={group.heading} aria-labelledby={`footer-${group.heading}`}>
              <h2
                id={`footer-${group.heading}`}
                className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-900"
              >
                {group.heading}
              </h2>
              <ul className="mt-4 flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="rounded text-sm text-ink-600 transition-colors hover:text-brand-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-200 py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-500">
            &copy; {year} {siteConfig.name}. All rights reserved.
          </p>
          <p className="text-sm text-ink-500">{siteConfig.tagline}</p>
        </div>
      </Container>
    </footer>
  );
}
