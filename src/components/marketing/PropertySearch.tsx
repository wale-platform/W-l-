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
import { universities, type UniversityId } from "@/config/site";
import { messageFrom } from "@/lib/api/field-errors";
import { formatNaira } from "@/lib/utils/format";
import {
  amenityTagOptions,
  propertySortOptions,
  type AmenityTag,
  type PropertySort,
  type SearchParams as SearchParamsType,
} from "@/lib/api/schemas";

/**
 * The public catalogue: search box, filter panel, results, pagination.
 *
 * Every control here maps to a parameter the API actually supports
 * (`listPropertiesQuerySchema` on the backend). That constraint is the point —
 * a filter the server ignores, or one whose values can never match what is
 * stored, returns an empty grid that reads as "no listings match" when the
 * truth is "that filter is broken". So the university and amenity controls
 * offer ids from the shared vocabularies rather than free text, and place names
 * are left to the search box, which the server matches with `contains`.
 */

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
  { value: "600000-800000", label: `${formatNaira(600000)} - ${formatNaira(800000)}` },
  { value: "800000-", label: `${formatNaira(800000)}+` },
] as const;

/** "2+ bedrooms" — a minimum, matching the API's `gte`. */
const roomCounts = [1, 2, 3, 4, 5] as const;

/** Everything that narrows the catalogue, in one object so a change is one update. */
type Filters = {
  query: string;
  university: UniversityId | "";
  type: NonNullable<SearchParamsType["type"]> | "";
  /** A `priceRanges` value ("200000-400000"), split into min/max on the way out. */
  priceRange: string;
  minBedrooms: string;
  minBathrooms: string;
  amenities: AmenityTag[];
  verifiedOnly: boolean;
  sort: PropertySort;
};

/**
 * Restore the rent `<Select>` from a URL only when the pair is one of the
 * offered bands. `?minPrice=137000` is a legitimate API request but not an
 * option in the list, and showing "Any price" beside results that are in fact
 * filtered would be a lie about what is on screen.
 */
function priceRangeFrom(initial: Partial<SearchParamsType>): string {
  const { minPrice, maxPrice } = initial;
  if (minPrice === undefined && maxPrice === undefined) return "";
  const candidate = `${minPrice ?? 0}-${maxPrice ?? ""}`;
  return priceRanges.some((range) => range.value === candidate) ? candidate : "";
}

function filtersFrom(initial: Partial<SearchParamsType>): Filters {
  return {
    query: initial.query ?? "",
    university: initial.university ?? "",
    type: initial.type ?? "",
    priceRange: priceRangeFrom(initial),
    minBedrooms: initial.minBedrooms !== undefined ? String(initial.minBedrooms) : "",
    minBathrooms: initial.minBathrooms !== undefined ? String(initial.minBathrooms) : "",
    amenities: initial.amenities ?? [],
    verifiedOnly: initial.verifiedOnly ?? false,
    sort: initial.sort ?? "newest",
  };
}

export function PropertySearch({
  initialParams = {},
}: {
  initialParams?: Partial<SearchParamsType>;
}) {
  const router = useRouter();
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<Filters>(() => filtersFrom(initialParams));
  const [page, setPage] = useState(initialParams.page ?? 1);

  /**
   * What is typed, as distinct from what is being searched for. The term only
   * becomes a request on submit, so a nine-character area name is one query
   * rather than nine — the Search button and the Enter key do the work they
   * appear to do.
   */
  const [queryDraft, setQueryDraft] = useState(initialParams.query ?? "");

  /**
   * Any change to what is being asked for returns to page 1. Carrying the page
   * across a filter change lands people on page 3 of a one-page result set: an
   * empty grid that reads as "nothing matches" when everything matching is on
   * the page they just left.
   */
  function update(patch: Partial<Filters>) {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }

  /**
   * Ticked tags are kept in vocabulary order rather than click order, so
   * ticking water-then-security and security-then-water produce the same query
   * — one cache entry and one request instead of two identical ones.
   */
  function toggleAmenity(tag: AmenityTag, checked: boolean) {
    const next = new Set(filters.amenities);
    if (checked) next.add(tag);
    else next.delete(tag);
    update({
      amenities: amenityTagOptions
        .map((option) => option.value)
        .filter((value) => next.has(value)),
    });
  }

  // What the API is asked for. Only keys with a value are set: an explicit
  // `undefined` would still become part of the query key and split the cache.
  const queryParams: Partial<SearchParamsType> = {
    page,
    pageSize: 12,
    sort: filters.sort,
  };
  if (filters.query) queryParams.query = filters.query;
  if (filters.university) queryParams.university = filters.university;
  if (filters.type) queryParams.type = filters.type;
  if (filters.minBedrooms) queryParams.minBedrooms = Number(filters.minBedrooms);
  if (filters.minBathrooms) queryParams.minBathrooms = Number(filters.minBathrooms);
  if (filters.amenities.length) queryParams.amenities = filters.amenities;
  if (filters.verifiedOnly) queryParams.verifiedOnly = true;
  if (filters.priceRange) {
    const [min, max] = filters.priceRange.split("-").map((s) => (s ? Number(s) : undefined));
    if (min !== undefined) queryParams.minPrice = min;
    if (max !== undefined) queryParams.maxPrice = max;
  }

  const { data, isLoading, isError, error } = useProperties(queryParams);

  // Mirror the state into the URL so a filtered view can be shared, bookmarked,
  // and reloaded. Amenities use the same comma encoding as the wire, so the
  // page's parser and the API agree on what `amenities=water,security` means.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.query) params.set("query", filters.query);
    if (filters.university) params.set("university", filters.university);
    if (filters.type) params.set("type", filters.type);
    if (filters.minBedrooms) params.set("minBedrooms", filters.minBedrooms);
    if (filters.minBathrooms) params.set("minBathrooms", filters.minBathrooms);
    if (filters.amenities.length) params.set("amenities", filters.amenities.join(","));
    if (filters.verifiedOnly) params.set("verifiedOnly", "true");
    if (filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.priceRange) {
      const [min, max] = filters.priceRange.split("-");
      if (min) params.set("minPrice", min);
      if (max) params.set("maxPrice", max);
    }
    if (page > 1) params.set("page", String(page));

    const newUrl = `/properties${params.toString() ? `?${params}` : ""}`;
    router.replace(newUrl, { scroll: false });
  }, [filters, page, router]);

  function handleSearch(event: FormEvent) {
    event.preventDefault();
    update({ query: queryDraft.trim() });
  }

  function handleClearFilters() {
    setQueryDraft("");
    // Ordering is not a filter — it does not hide anything — so clearing the
    // filters leaves the chosen sort alone.
    update({
      query: "",
      university: "",
      type: "",
      priceRange: "",
      minBedrooms: "",
      minBathrooms: "",
      amenities: [],
      verifiedOnly: false,
    });
  }

  // Each ticked amenity counts separately, because each one is a separate
  // requirement the results have to meet.
  const activeFilters =
    (filters.query ? 1 : 0) +
    (filters.university ? 1 : 0) +
    (filters.type ? 1 : 0) +
    (filters.priceRange ? 1 : 0) +
    (filters.minBedrooms ? 1 : 0) +
    (filters.minBathrooms ? 1 : 0) +
    filters.amenities.length +
    (filters.verifiedOnly ? 1 : 0);

  return (
    <>
      {/* Search bar + filter toggle */}
      <Section as="div" spacing="tight" className="bg-ink-50/70">
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
                  value={queryDraft}
                  onChange={(event) => setQueryDraft(event.target.value)}
                  placeholder="Search Akoka, Agbowo, Samaru…"
                  className="h-12 pl-10"
                />
              </div>

              <Button
                type="button"
                tone="outline"
                size="lg"
                className="h-12"
                onClick={() => setShowFilters(!showFilters)}
                aria-expanded={showFilters}
                aria-controls="filters-panel"
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                Filters
                {activeFilters > 0 && (
                  <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                    {activeFilters}
                  </span>
                )}
              </Button>

              <Button type="submit" size="lg" className="h-12 px-8">
                Search
              </Button>
            </div>
          </form>
        </Container>
      </Section>

      {/* Filters panel */}
      {showFilters && (
        <Section
          as="div"
          id="filters-panel"
          spacing="tight"
          className="border-b border-ink-200 bg-white"
        >
          <Container size="default">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label
                  htmlFor="filter-university"
                  className="mb-2 block text-sm font-medium text-ink-900"
                >
                  University
                </label>
                <Select
                  id="filter-university"
                  value={filters.university}
                  onChange={(event) =>
                    update({ university: event.target.value as UniversityId | "" })
                  }
                >
                  <option value="">Any university</option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.short}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label
                  htmlFor="filter-type"
                  className="mb-2 block text-sm font-medium text-ink-900"
                >
                  Apartment type
                </label>
                <Select
                  id="filter-type"
                  value={filters.type}
                  onChange={(event) =>
                    update({ type: event.target.value as Filters["type"] })
                  }
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
                <label
                  htmlFor="filter-price"
                  className="mb-2 block text-sm font-medium text-ink-900"
                >
                  Annual rent
                </label>
                <Select
                  id="filter-price"
                  value={filters.priceRange}
                  onChange={(event) => update({ priceRange: event.target.value })}
                >
                  {priceRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="filter-bedrooms"
                    className="mb-2 block text-sm font-medium text-ink-900"
                  >
                    Bedrooms
                  </label>
                  <Select
                    id="filter-bedrooms"
                    value={filters.minBedrooms}
                    onChange={(event) => update({ minBedrooms: event.target.value })}
                  >
                    <option value="">Any</option>
                    {roomCounts.map((n) => (
                      <option key={n} value={n}>
                        {n}+
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="filter-bathrooms"
                    className="mb-2 block text-sm font-medium text-ink-900"
                  >
                    Bathrooms
                  </label>
                  <Select
                    id="filter-bathrooms"
                    value={filters.minBathrooms}
                    onChange={(event) => update({ minBathrooms: event.target.value })}
                  >
                    <option value="">Any</option>
                    {roomCounts.map((n) => (
                      <option key={n} value={n}>
                        {n}+
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/*
                Ticking two boxes means both are required, which is how the API
                reads them — not "either one will do".
              */}
              <fieldset className="sm:col-span-2 lg:col-span-3">
                <legend className="mb-2 text-sm font-medium text-ink-900">
                  Must have
                </legend>
                <div className="flex flex-wrap gap-x-5 gap-y-2.5">
                  {amenityTagOptions.map((option) => (
                    <label
                      key={option.value}
                      className="flex cursor-pointer items-center gap-2 text-sm text-ink-700"
                    >
                      <Checkbox
                        checked={filters.amenities.includes(option.value)}
                        onChange={(event) =>
                          toggleAmenity(option.value, event.target.checked)
                        }
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="flex items-end">
                <label
                  htmlFor="filter-verified"
                  className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink-900"
                >
                  <Checkbox
                    id="filter-verified"
                    checked={filters.verifiedOnly}
                    onChange={(event) => update({ verifiedOnly: event.target.checked })}
                  />
                  Verified only
                </label>
              </div>
            </div>

            {activeFilters > 0 && (
              <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-4">
                <p className="text-sm text-ink-600">
                  {activeFilters} active {activeFilters === 1 ? "filter" : "filters"}
                </p>
                <Button type="button" tone="ghost" size="sm" onClick={handleClearFilters}>
                  <X aria-hidden="true" className="size-4" />
                  Clear all
                </Button>
              </div>
            )}
          </Container>
        </Section>
      )}

      {/* Results */}
      <Section>
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
              description={messageFrom(
                error,
                "We're having trouble loading the listings. Please try again.",
              )}
              action={<Button onClick={() => window.location.reload()}>Reload page</Button>}
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
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-ink-600">
                  Showing {data.properties.length} of {data.total}{" "}
                  {data.total === 1 ? "property" : "properties"}
                </p>

                <div className="flex items-center gap-2">
                  <label
                    htmlFor="sort-order"
                    className="text-sm font-medium text-ink-700"
                  >
                    Sort by
                  </label>
                  <Select
                    id="sort-order"
                    value={filters.sort}
                    onChange={(event) =>
                      update({ sort: event.target.value as PropertySort })
                    }
                    className="w-auto"
                  >
                    {propertySortOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
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
