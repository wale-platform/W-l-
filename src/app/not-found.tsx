import type { Metadata } from "next";
import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container, Section } from "@/components/layout/Container";
import { Button } from "@/components/ui";
import { mainNav } from "@/config/site";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * Custom 404.
 *
 * Lives at the app root, so it renders *outside* the `(marketing)` route
 * group and does not inherit its Navbar/Footer shell. The chrome is
 * repeated here deliberately — without it the root layout's skip link
 * would point at a `#main` that doesn't exist.
 */
export default function NotFound() {
  return (
    <>
      <Navbar />

      <main id="main" className="flex-1">
        <Section spacing="loose">
          <Container size="narrow">
            <div className="flex flex-col items-center gap-6 text-center">
              <span className="flex size-20 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                <FileQuestion aria-hidden="true" className="size-9" />
              </span>

              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-600">
                Error 404
              </p>

              <h1 className="text-4xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
                We couldn&apos;t find that page
              </h1>

              <p className="max-w-lg text-lg leading-8 text-ink-600">
                The link may be broken, or the listing you were looking for has
                been rented and taken down. Either way, the search is still on.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/properties">
                  <Button size="lg">Browse verified homes</Button>
                </Link>
                <Link href="/">
                  <Button size="lg" tone="outline">
                    Back to home
                  </Button>
                </Link>
              </div>

              <nav aria-label="Site pages" className="mt-6 border-t border-ink-200 pt-6">
                <p className="text-sm text-ink-500">Or try one of these pages:</p>
                <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
                  {mainNav.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm font-medium text-brand-700 hover:text-brand-800 hover:underline"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </Container>
        </Section>
      </main>

      <Footer />
    </>
  );
}
