import type { ReactNode } from "react";
import { Container, Section } from "@/components/layout/Container";
import { Alert } from "@/components/ui";

export interface LegalSection {
  heading: string;
  body: ReactNode;
}

/**
 * Shared shell for the legal pages (terms, privacy).
 *
 * Both documents are the same shape — a title, a revision date, and a
 * numbered run of headed sections — so the layout lives here once and
 * each page supplies only its content.
 */
export function LegalPage({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  /** Human-readable revision date, e.g. "1 August 2026". */
  updated: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <Section as="div" spacing="tight" className="bg-ink-50/70">
        <Container size="narrow" className="flex flex-col gap-4">
          <h1 className="text-4xl font-semibold tracking-tight text-ink-900">
            {title}
          </h1>
          <p className="text-sm text-ink-500">Last updated {updated}</p>
          <p className="text-base leading-7 text-ink-700">{intro}</p>
        </Container>
      </Section>

      <Section spacing="tight">
        <Container size="narrow" className="flex flex-col gap-10">
          <Alert
            tone="warning"
            title="Draft pending legal review"
          >
            This document is a working draft written for the product build. It
            has not been reviewed by a qualified legal practitioner and should
            not be relied on as the final agreement.
          </Alert>

          {/* Table of contents — these pages are long enough to need one. */}
          <nav aria-labelledby="toc-heading" className="rounded-card border border-ink-200 p-5">
            <h2 id="toc-heading" className="text-sm font-semibold text-ink-900">
              On this page
            </h2>
            <ol className="mt-3 flex flex-col gap-2">
              {sections.map((section, i) => (
                <li key={section.heading}>
                  <a
                    href={`#section-${i + 1}`}
                    className="text-sm text-brand-700 hover:underline"
                  >
                    {i + 1}. {section.heading}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="flex flex-col gap-10">
            {sections.map((section, i) => (
              <section
                key={section.heading}
                id={`section-${i + 1}`}
                className="scroll-mt-24 flex flex-col gap-3"
              >
                <h2 className="text-xl font-semibold text-ink-900">
                  {i + 1}. {section.heading}
                </h2>
                <div className="flex flex-col gap-3 text-base leading-7 text-ink-700">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
