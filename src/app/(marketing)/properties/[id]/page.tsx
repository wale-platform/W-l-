import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Bath,
  BedDouble,
  CalendarDays,
  MapPin,
  Check,
  ArrowLeft,
} from "lucide-react";

import { Container, Section } from "@/components/layout/Container";
import { InspectionRequest } from "@/components/property/InspectionRequest";
import { PropertyContact } from "@/components/property/PropertyContact";
import { PropertyGallery } from "@/components/property/PropertyGallery";
import { Badge, Breadcrumbs, Card, CardBody } from "@/components/ui";
import { siteConfig } from "@/config/site";
import { getPublicProperty } from "@/lib/api/server-property";
import {
  formatDate,
  formatPropertyType,
  formatRent,
  formatSource,
  universityName,
} from "@/lib/utils/format";
import type { Property } from "@/lib/api/schemas";

/**
 * One listing, in full.
 *
 * This page did not exist, which made every card in the catalogue and on the
 * home page a link to a 404 — the single largest hole in the public product.
 *
 * Server-rendered rather than fetched in the browser, because a listing link is
 * shared into a WhatsApp group far more often than it is found through search,
 * and an unfurl card is built from the metadata in the first HTML response. A
 * title that arrives after hydration arrives too late for the crawler that
 * produces the preview.
 */

type Props = { params: Promise<{ id: string }> };

/**
 * What a shared link looks like before anyone clicks it.
 *
 * Deliberately concrete: rent, bedrooms and the area, because that is what
 * decides whether a student in the group taps through. `notFound` is not called
 * here — the page below does that; metadata for a missing listing just falls
 * back to something harmless.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const property = await getPublicProperty(id);

  if (!property) {
    return { title: "Listing not found", robots: { index: false, follow: false } };
  }

  const title = `${property.title} — ${formatRent(property.price)}`;
  const description = `${formatPropertyType(property.type)} · ${property.bedrooms} bedroom${
    property.bedrooms === 1 ? "" : "s"
  } · ${property.bathrooms} bathroom${property.bathrooms === 1 ? "" : "s"} in ${
    property.city
  }, ${property.state}. Available ${formatDate(property.availableDate)}.`;

  const url = `${siteConfig.url}/properties/${property.id}`;
  const image = absoluteImage(property.images[0]);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      siteName: siteConfig.name,
      title,
      description,
      ...(image ? { images: [{ url: image, alt: property.title }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    // An unverified listing is not something to put in front of a search engine
    // as though WALE stood behind it. It stays reachable by link — the landlord
    // needs to be able to preview and share their own listing — but is not
    // offered up for indexing until somebody has checked it.
    robots: property.verified
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

/**
 * A photo URL an unfurl crawler can actually fetch.
 *
 * Cloudinary URLs are already absolute; the first-party imagery is
 * root-relative and has to be joined to the site origin, because a crawler
 * resolving `/listings/listing-01.jpg` against its own host gets nothing.
 */
function absoluteImage(src: string | undefined): string | undefined {
  if (!src) return undefined;
  if (/^https?:\/\//i.test(src)) return src;
  return `${siteConfig.url}${src.startsWith("/") ? "" : "/"}${src}`;
}

export default async function PropertyDetailPage({ params }: Props) {
  const { id } = await params;
  const property = await getPublicProperty(id);

  // The same 404 for a listing that never existed, one still in draft, and one
  // that was suspended. Telling them apart would let anyone with a list of ids
  // discover which listings are being hidden, which is the one thing a
  // suspension must not announce.
  if (!property) notFound();

  const uni = universityName(property.university);

  return (
    <Section spacing="tight">
      <Container size="wide" className="flex flex-col gap-8">
        <div className="flex flex-col gap-4">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "Browse homes", href: "/properties" },
              { label: property.title },
            ]}
          />

          {/* A plain way back on mobile, where the breadcrumb trail wraps and
              the browser's own back button is the only other option. */}
          <Link
            href="/properties"
            className="flex w-fit items-center gap-1.5 text-sm text-ink-500 transition-colors hover:text-brand-700 sm:hidden"
          >
            <ArrowLeft aria-hidden="true" className="size-3.5" />
            All listings
          </Link>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start">
          <div className="flex flex-col gap-8">
            <PropertyGallery
              images={property.images}
              title={property.title}
              verified={property.verified}
            />

            <header className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {uni && <Badge tone="outline">Near {uni}</Badge>}
                <Badge tone="neutral">{formatPropertyType(property.type)}</Badge>
                <Badge tone="neutral">Listed by {formatSource(property.source)}</Badge>
              </div>

              <h1 className="text-2xl font-semibold leading-tight text-ink-900 sm:text-3xl">
                {property.title}
              </h1>

              <p className="flex items-start gap-2 text-ink-600">
                <MapPin aria-hidden="true" className="mt-1 size-4 shrink-0 text-ink-400" />
                <span>
                  {property.address}, {property.city}, {property.state}
                </span>
              </p>
            </header>

            <Facts property={property} />

            <section className="flex flex-col gap-3">
              <h2 className="text-lg font-semibold text-ink-900">About this place</h2>
              {/* `whitespace-pre-line` so the paragraph breaks a landlord typed
                  survive. The text is escaped by React, never interpreted. */}
              <p className="whitespace-pre-line leading-relaxed text-ink-700">
                {property.description}
              </p>
            </section>

            {property.amenities.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-lg font-semibold text-ink-900">What it comes with</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {property.amenities.map((amenity) => (
                    <li key={amenity} className="flex items-start gap-2 text-ink-700">
                      <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                      {amenity}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>

          {/* Sticky on a wide screen so the rent and the phone number stay put
              while the description is read; in normal flow on a narrow one,
              where a sticky panel would eat the viewport. */}
          <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
            <Card>
              <CardBody className="flex flex-col gap-1">
                <p className="text-2xl font-semibold text-brand-800">
                  {formatRent(property.price)}
                </p>
                <p className="text-sm text-ink-500">
                  Available {formatDate(property.availableDate)}
                </p>
              </CardBody>
            </Card>

            <PropertyContact property={property} />

            {/* Below the contact card on purpose: someone who has decided to
                call can do so without scrolling past a form, and the safety
                note about never paying to inspect is read before the booking
                flow rather than after it. */}
            <InspectionRequest propertyId={property.id} propertyTitle={property.title} />
          </aside>
        </div>
      </Container>
    </Section>
  );
}

/** Bedrooms, bathrooms, and when it is free — the three things scanned first. */
function Facts({ property }: { property: Property }) {
  const facts = [
    {
      icon: BedDouble,
      label: property.bedrooms === 0 ? "Studio" : `${property.bedrooms} bedroom${property.bedrooms === 1 ? "" : "s"}`,
    },
    {
      icon: Bath,
      label: `${property.bathrooms} bathroom${property.bathrooms === 1 ? "" : "s"}`,
    },
    { icon: CalendarDays, label: `Available ${formatDate(property.availableDate)}` },
  ];

  return (
    <ul className="flex flex-wrap gap-x-8 gap-y-3 border-y border-ink-100 py-5">
      {facts.map(({ icon: Icon, label }) => (
        <li key={label} className="flex items-center gap-2 text-ink-700">
          <Icon aria-hidden="true" className="size-5 shrink-0 text-ink-400" />
          {label}
        </li>
      ))}
    </ul>
  );
}
