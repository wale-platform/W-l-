import type { Metadata } from "next";
import { PropertySearch } from "@/components/marketing/PropertySearch";
import {
  amenityTagSchema,
  propertySortSchema,
  propertyTypeSchema,
  universityIdSchema,
  type AmenityTag,
  type SearchParams as SearchParamsType,
} from "@/lib/api/schemas";

export const metadata: Metadata = {
  title: "Browse Homes",
  description:
    "Search verified student housing near Nigerian universities. Filter by budget, university, apartment type, and verification status.",
};

/**
 * The URL is untrusted input: it can be hand-edited, pasted from an old build,
 * or truncated by a chat app. So every parameter is validated against the same
 * schema the API uses, and anything that fails is dropped rather than forwarded.
 *
 * Dropping is right here even though the backend prefers to reject: a bad value
 * in a link should leave the visitor with a working catalogue and a filter
 * control that visibly shows the filter is off — not a 422 error page. What must
 * never happen is a filter that is applied to the query but not reflected in the
 * controls, which is why the components read from this same object.
 */

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** A whole number in range, or nothing. Rejects "12a", "-3", "" and NaN alike. */
function wholeNumber(
  value: string | string[] | undefined,
  { min, max }: { min: number; max: number },
): number | undefined {
  const raw = first(value);
  if (!raw || !/^\d+$/.test(raw)) return undefined;
  const n = Number(raw);
  return n >= min && n <= max ? n : undefined;
}

/** A value from a closed vocabulary, or nothing. */
function fromEnum<T extends string>(
  schema: { safeParse: (v: unknown) => { success: true; data: T } | { success: false } },
  value: string | string[] | undefined,
): T | undefined {
  const parsed = schema.safeParse(first(value));
  return parsed.success ? parsed.data : undefined;
}

/**
 * `amenities=water,security` — the same comma encoding the API takes, so a
 * shared link and the request it produces cannot disagree. Unknown ids are
 * dropped individually; one stale tag does not throw away the rest.
 */
function amenityTags(value: string | string[] | undefined): AmenityTag[] | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const tags = raw
    .split(",")
    .map((part) => amenityTagSchema.safeParse(part.trim()))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []));
  return tags.length ? tags : undefined;
}

export default async function PropertiesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;

  // Only keys with a real value are set: an explicit `undefined` would still
  // become part of the react-query key and split the cache pointlessly.
  const initialParams: Partial<SearchParamsType> = {};

  const query = first(searchParams?.query)?.trim();
  if (query) initialParams.query = query;

  const university = fromEnum(universityIdSchema, searchParams?.university);
  if (university) initialParams.university = university;

  const type = fromEnum(propertyTypeSchema, searchParams?.type);
  if (type) initialParams.type = type;

  const sort = fromEnum(propertySortSchema, searchParams?.sort);
  if (sort) initialParams.sort = sort;

  const amenities = amenityTags(searchParams?.amenities);
  if (amenities) initialParams.amenities = amenities;

  // Only "true" turns it on. `?verifiedOnly=maybe` is not a request to widen the
  // results to unverified listings, it is a broken link.
  if (first(searchParams?.verifiedOnly) === "true") initialParams.verifiedOnly = true;

  const minPrice = wholeNumber(searchParams?.minPrice, { min: 0, max: 1_000_000_000 });
  if (minPrice !== undefined) initialParams.minPrice = minPrice;

  const maxPrice = wholeNumber(searchParams?.maxPrice, { min: 0, max: 1_000_000_000 });
  if (maxPrice !== undefined) initialParams.maxPrice = maxPrice;

  const minBedrooms = wholeNumber(searchParams?.minBedrooms, { min: 0, max: 20 });
  if (minBedrooms !== undefined) initialParams.minBedrooms = minBedrooms;

  const minBathrooms = wholeNumber(searchParams?.minBathrooms, { min: 0, max: 20 });
  if (minBathrooms !== undefined) initialParams.minBathrooms = minBathrooms;

  const page = wholeNumber(searchParams?.page, { min: 1, max: 10_000 });
  if (page !== undefined) initialParams.page = page;

  return <PropertySearch initialParams={initialParams} />;
}
