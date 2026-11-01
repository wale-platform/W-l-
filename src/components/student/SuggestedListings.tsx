"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/PropertyCard";
import { universities } from "@/config/site";
import { useProperties } from "@/hooks/useProperties";
import type { Property } from "@/lib/api/schemas";
import { formatNaira } from "@/lib/utils/format";

/** Suggestions shown at first, and added each time the list grows. */
const PAGE = 6;

export interface SuggestionPreferences {
  university?: string;
  maxBudget?: number;
  location?: string;
}

interface Suggestion {
  property: Property;
  score: number;
  reasons: string[];
}

/**
 * Rank listings for a student: their university first, then budget and
 * preferred area, then verified / boosted / available homes. Purely
 * client-side, from listing data — nothing is sent anywhere.
 */
export function rankSuggestions(
  listings: Property[],
  preferences: SuggestionPreferences,
  now: number,
): Suggestion[] {
  const uni = universities.find((option) => option.id === preferences.university);
  const terms = (preferences.location ?? "")
    .toLowerCase()
    .split(/[\s,/]+/)
    .filter((term) => term.length > 2);

  return listings
    .filter((property) => property.availabilityStatus !== "occupied")
    .map((property) => {
      let score = 0;
      const reasons: string[] = [];

      if (uni && property.university === uni.id) {
        score += 50;
        reasons.push(`Near ${uni.short}`);
      }
      if (preferences.maxBudget) {
        if (property.price <= preferences.maxBudget) {
          score += 25;
          reasons.push("Within your budget");
        } else if (property.price > preferences.maxBudget * 1.5) {
          score -= 30;
        }
      }
      if (terms.length) {
        const haystack = `${property.title} ${property.address} ${property.city}`.toLowerCase();
        if (terms.some((term) => haystack.includes(term))) {
          score += 20;
          reasons.push("In your preferred area");
        }
      }
      if (property.verified) {
        score += 10;
        reasons.push("Verified");
      }
      if (property.boostedUntil && new Date(property.boostedUntil).getTime() > now) score += 8;
      if (property.availabilityStatus === "available") score += 4;

      return { property, score, reasons: reasons.slice(0, 3) };
    })
    .sort((a, b) => b.score - a.score || a.property.price - b.property.price);
}

/** "Suggested for you" — shown first on the student dashboard. */
export function SuggestedListings({ preferences, now }: { preferences: SuggestionPreferences; now: number }) {
  const { data, isPending, isError } = useProperties({ pageSize: 50 });
  const ranked = useMemo(
    () => (data ? rankSuggestions(data.properties, preferences, now) : []),
    [data, now, preferences],
  );
  const [visible, setVisible] = useState(PAGE);
  const suggestions = ranked.slice(0, visible);
  const hasMore = visible < ranked.length;
  const showMore = () => setVisible((count) => count + PAGE);

  // Infinite scroll: load the next batch as the end of the list comes into
  // view. The "Show more" button stays as a fallback (keyboard, no observer).
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setVisible((count) => count + PAGE);
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, visible]);

  const uni = universities.find((option) => option.id === preferences.university);
  const basis = [uni ? uni.short : null, preferences.maxBudget ? `up to ${formatNaira(preferences.maxBudget)}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <section aria-labelledby="suggested-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-brand-800">
            <Sparkles aria-hidden="true" className="size-3.5" /> Picked for you
          </p>
          <h2 id="suggested-title" className="mt-1 text-xl font-bold tracking-tight text-ink-950 sm:text-2xl">
            Suggested homes
          </h2>
          <p className="mt-0.5 text-sm text-ink-500">
            {basis ? `Based on your profile: ${basis}.` : "Popular verified homes near campus."}{" "}
            <Link href="/student/profile" className="font-semibold text-brand-700 hover:underline">
              Update preferences
            </Link>
          </p>
        </div>
        <Link href="/match" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">
          Fine-tune with AI Match <ArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </div>

      {isError ? (
        <p className="rounded-2xl bg-ink-50 p-6 text-sm text-ink-600">Suggestions couldn&apos;t be loaded right now.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {isPending
            ? Array.from({ length: 3 }, (_, index) => (
                <li key={index}>
                  <PropertyCardSkeleton />
                </li>
              ))
            : suggestions.map(({ property, reasons }) => (
                <li key={property.id} className="flex flex-col gap-2">
                  {reasons.length > 0 && (
                    <div className="flex flex-wrap gap-1.5" aria-label="Why it's suggested">
                      {reasons.map((reason) => (
                        <span key={reason} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-800">
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                  <PropertyCard property={property} />
                </li>
              ))}
        </ul>
      )}

      {!isPending && !isError && (
        <div ref={sentinel} className="flex flex-col items-center gap-2 pt-2">
          {hasMore ? (
            <button
              type="button"
              onClick={showMore}
              className="rounded-full border border-ink-200 bg-white px-5 py-2 text-sm font-semibold text-ink-800 transition-colors hover:border-brand-300 hover:bg-brand-50"
            >
              Show more homes
              <span className="ml-1.5 text-xs font-normal text-ink-500">({ranked.length - visible} more)</span>
            </button>
          ) : (
            ranked.length > PAGE && (
              <p className="text-sm text-ink-500">
                That&apos;s all {ranked.length} suggestions.{" "}
                <Link href="/properties" className="font-semibold text-brand-700 hover:underline">
                  Browse all homes
                </Link>
              </p>
            )
          )}
        </div>
      )}
    </section>
  );
}
