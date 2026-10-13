"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, type FormEvent } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Container, Section } from "@/components/layout/Container";
import { PropertyCard, PropertyCardSkeleton } from "@/components/property/PropertyCard";
import {
  Button,
  Input,
  Select,
  Checkbox,
  EmptyState,
  ErrorState,
  Pagination,
} from "@/components/ui";
import { useProperties } from "@/hooks/useProperties";
import { universities } from "@/config/site";
import { formatNaira } from "@/lib/utils/format";
import type { SearchParams as SearchParamsType } from "@/lib/api/schemas";

const propertyTypes = [
  { value: "studio", label: "Self-contained" },
  { value: "one_bedroom", label: "1 bedroom" },
  { value: "two_bedroom", label: "2 bedroom" },
  { value: "shared", label: "Shared / single room" },
] as const;

const priceRanges = [
  { value: "", label: "Any price" },
  { value: "0-200000", label: `Up to ${formatNaira(200000)}` },
  { value: "200000-400000", label: `${formatNaira(200000)} - ${formatNaira(400000)}` },
  { value: "400000-600000", label: `${formatNaira(400000)} - ${formatNaira(600000)}` },
  { value: "600000-800000", label: `${formatNaira(400000)} - ${formatNaira(800000)}` },
  { value: "800000-", label: `${formatNaira(800000)}+` },
];

const sourceTypes = [
  { value: "wale", label: "WALE Direct" },
  { value: "landlord", label: "Direct Landlord" },
  { value: "agent", label: "Verified Lawyer / Agent" },
];

const availabilityTypes = [
  { value: "immediate", label: "Available immediately" },
];

export function PropertySearch({
  initialParams = {},
}: {
  initialParams?: Partial<SearchParamsType>;
}) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  // Local filter state — mirrors URL params
  const [query, setQuery] = useState(initialParams.query ?? "");
  const [university, setUniversity] = useState(initialParams.university ?? "");
  const [type, setType] = useState<SearchParamsType["type"] | "">(
    initialParams.type ?? "",
  );
  const [priceRange, setPriceRange] = useState(() => {
    if (initialParams.minPrice !== undefined && initialParams.maxPrice !== undefined) {
      return `${initialParams.minPrice}-${initialParams.maxPrice}`;
    }
    if (initialParams.minPrice !== undefined) {
      return `${initialParams.minPrice}-`;
    }
    if (initialParams.maxPrice !== undefined) {
      return `0-${initialParams.maxPrice}`;
    }
    return "";
  });
  const [verifiedOnly, setVerifiedOnly] = useState(
    initialParams.verifiedOnly ?? false,
  );
  const [source, setSource] = useState(initialParams.source ?? "");
  const [availability, setAvailability] = useState(initialParams.availability ?? "");
  const [sortBy, setSortBy] = useState(initialParams.sortBy ?? "newest");
  const [page, setPage] = useState(initialParams.page ?? 1);

  // Build the actual query from local state
  const queryParams: Partial<SearchParamsType> = {
    page,
    pageSize: 12,
  };
  if (query.trim()) queryParams.query = query.trim();
  if (university) queryParams.university = university;
  if (type) queryParams.type = type;
  if (verifiedOnly) queryParams.verifiedOnly = true;
  if (source) queryParams.source = source;
  if (availability) queryParams.availability = availability;
  if (sortBy) queryParams.sortBy = sortBy;
  
  if (priceRange) {
    const [min, max] = priceRange.split("-").map((s) => (s ? Number(s) : undefined));
    if (min !== undefined) queryParams.minPrice = min;
    if (max !== undefined) queryParams.maxPrice = max;
  }

  const { data, isLoading, isError, error } = useProperties(queryParams);

  // Sync state back to URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("query", query.trim());
    if (university) params.set("university", university);
    if (type) params.set("type", type);
    if (verifiedOnly) params.set("verifiedOnly", "true");
    if (source) params.set("source", source);
    if (availability) params.set("availability", availability);
    if (sortBy && sortBy !== "newest") params.set("sortBy", sortBy);
    if (priceRange) {
      const [min, max] = priceRange.split("-");
      if (min) params.set("minPrice", min);
      if (max) params.set("maxPrice", max);
    }
    if (page > 1) params.set("page", String(page));

    const newUrl = `/properties${params.toString() ? `?${params}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [query, university, type, verifiedOnly, priceRange, source, availability, sortBy, page, router]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1); // Reset to first page on new search
  }

  function handleClearFilters() {
    setQuery("");
    setUniversity("");
    setType("");
    setPriceRange("");
    setVerifiedOnly(false);
    setSource("");
    setAvailability("");
    setSortBy("newest");
    setPage(1);
  }

  const activeFilters =
    (query.trim() ? 1 : 0) +
    (university ? 1 : 0) +
    (type ? 1 : 0) +
    (priceRange ? 1 : 0) +
    (verifiedOnly ? 1 : 0) +
    (source ? 1 : 0) +
    (availability ? 1 : 0);

  return (
    <>
      {/* Search bar + filter toggle */}
      <Section as="div" spacing="tight" className="bg-ink-50/70 py-6 border-b border-ink-100">
        <Container size="default">
          <form
            onSubmit={handleSearch}
            role="search"
            aria-label="Search properties"
            className="flex flex-col gap-3"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <label htmlFor="search-query" className="sr-only">
                  Search by area, city, or landmark
                </label>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-ink-400"
                />
                <Input
                  id="search-query"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search Tanke, Oke-Odo, Malete, Fate…"
                  className="h-12 pl-10"
                />
              </div>

              <Button
                type="button"
                tone="outline"
                size="lg"
                className="h-12 shrink-0"
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                aria-controls="filters-panel"
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                Filters
                {activeFilters > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                    {activeFilters}
                  </span>
                )}
              </Button>

              <Button type="submit" size="lg" className="h-12 px-8 shrink-0">
                Search
              </Button>
            </div>
          </form>
        </Container>
      </Section>

      {/* Filters panel */}
      {showFilters && (
        <Section as="div" id="filters-panel" spacing="tight" className="border-b border-ink-200 bg-white py-6">
          <Container size="default">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {/* Row 1 */}
              <div>
                <label htmlFor="filter-university" className="mb-1.5 block text-sm font-semibold text-ink-950">
                  University
                </label>
                <Select
                  id="filter-university"
                  value={university}
                  onChange={(event) => {
                    setUniversity(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any university</option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.short} ({uni.name})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="filter-type" className="mb-1.5 block text-sm font-semibold text-ink-950">
                  Apartment type
                </label>
                <Select
                  id="filter-type"
                  value={type}
                  onChange={(event) => {
                    setType(event.target.value as SearchParamsType["type"] | "");
                    setPage(1);
                  }}
                >
                  <option value="">Any type</option>
                  {propertyTypes.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="filter-price" className="mb-1.5 block text-sm font-semibold text-ink-950">
                  Annual rent budget
                </label>
                <Select
                  id="filter-price"
                  value={priceRange}
                  onChange={(event) => {
                    setPriceRange(event.target.value);
                    setPage(1);
                  }}
                >
                  {priceRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Row 2 */}
              <div>
                <label htmlFor="filter-source" className="mb-1.5 block text-sm font-semibold text-ink-950">
                  Listing source
                </label>
                <Select
                  id="filter-source"
                  value={source}
                  onChange={(event) => {
                    setSource(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any publisher</option>
                  {sourceTypes.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label htmlFor="filter-availability" className="mb-1.5 block text-sm font-semibold text-ink-950">
                  Availability
                </label>
                <Select
                  id="filter-availability"
                  value={availability}
                  onChange={(event) => {
                    setAvailability(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Any availability</option>
                  {availabilityTypes.map((av) => (
                    <option key={av.value} value={av.value}>
                      {av.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center pt-6">
                <label htmlFor="filter-verified" className="flex items-center gap-2.5 text-sm font-semibold text-ink-900 cursor-pointer select-none">
                  <Checkbox
                    id="filter-verified"
                    checked={verifiedOnly}
                    onChange={(event) => {
                      setVerifiedOnly(event.target.checked);
                      setPage(1);
                    }}
                  />
                  Verified by WALE only
                </label>
              </div>
            </div>

            {activeFilters > 0 && (
              <div className="mt-6 flex items-center justify-between border-t border-ink-100 pt-4">
                <p className="text-sm font-medium text-ink-600">
                  {activeFilters} active {activeFilters === 1 ? "filter" : "filters"}
                </p>
                <Button
                  type="button"
                  tone="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                >
                  <X aria-hidden="true" className="size-4" />
                  Clear all filters
                </Button>
              </div>
            )}
          </Container>
        </Section>
      )}

      {/* Results */}
      <Section className="py-10">
        <Container size="wide">
          {isLoading && (
            <div aria-busy="true" aria-live="polite">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <PropertyCardSkeleton key={i} />
                ))}
              </div>
            </div>
          )}

          {isError && (
            <ErrorState
              title="Could not load properties"
              description={
                error instanceof Error
                  ? error.message
                  : "We're having trouble loading the listings. Please try again."
              }
              action={
                <Button onClick={() => window.location.reload()}>
                  Reload page
                </Button>
              }
            />
          )}

          {data && data.properties.length === 0 && (
            <EmptyState
              icon={<Search className="size-6" />}
              title="No properties found"
              description={
                activeFilters > 0
                  ? "Try adjusting your filters or search term to see more results."
                  : "There are no listings matching your search."
              }
              action={
                activeFilters > 0 ? (
                  <Button onClick={handleClearFilters}>Clear filters</Button>
                ) : null
              }
            />
          )}

          {data && data.properties.length > 0 && (
            <>
              {/* Header with Showing X and Sorting */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-ink-100 pb-4">
                <p className="text-sm text-ink-600">
                  Showing {data.properties.length} of {data.total}{" "}
                  {data.total === 1 ? "property" : "properties"}
                </p>

                <div className="flex items-center gap-2">
                  <label htmlFor="sort-by" className="text-sm font-semibold text-ink-700 whitespace-nowrap">
                    Sort by:
                  </label>
                  <Select
                    id="sort-by"
                    value={sortBy}
                    onChange={(event) => {
                      setSortBy(event.target.value);
                      setPage(1);
                    }}
                    className="w-[180px] h-9 text-xs"
                  >
                    <option value="newest">Newest listings</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </Select>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {data.properties.map((property) => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>

              {data.totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={data.totalPages}
                  onPageChange={setPage}
                  className="mt-10 justify-center"
                />
              )}
            </>
          )}
        </Container>
      </Section>
    </>
  );
}
