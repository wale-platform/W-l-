"use client";

import Link from "next/link";
import { ArrowRight, SearchX } from "lucide-react";
import { useProperties } from "@/hooks/useProperties";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/PropertyCard";
import { Button, EmptyState, ErrorState } from "@/components/ui";

/**
 * Featured listings on the home page.
 *
 * Client component because it fetches through TanStack Query — which
 * also gives us the loading and error branches the brief asks for
 * without hand-rolling state.
 */
export function FeaturedListings({ limit = 6 }: { limit?: number }) {
  const { data, isPending, isError, refetch } = useProperties({
    verifiedOnly: true,
    pageSize: limit,
  });

  if (isError) {
    return (
      <ErrorState
        title="Couldn't load listings"
        description="The listings service didn't respond. This is usually temporary."
        action={
          <Button tone="outline" onClick={() => refetch()}>
            Try again
          </Button>
        }
      />
    );
  }

  if (isPending) {
    return (
      <div
        aria-busy="true"
        aria-label="Loading featured listings"
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {Array.from({ length: limit }).map((_, i) => (
          <PropertyCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (data.properties.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="size-5" />}
        title="No verified listings yet"
        description="We're onboarding landlords right now. Check back shortly."
      />
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.properties.map((property) => (
          <PropertyCard key={property.id} property={property} />
        ))}
      </div>

      <div className="flex justify-center">
        <Link href="/properties">
          <Button tone="outline" size="lg">
            Browse all {data.total} homes
            <ArrowRight aria-hidden="true" className="size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
