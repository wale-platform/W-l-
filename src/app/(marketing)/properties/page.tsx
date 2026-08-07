import type { Metadata } from "next";
import { PropertySearch } from "@/components/marketing/PropertySearch";
import type { SearchParams as SearchParamsType } from "@/lib/api/schemas";

export const metadata: Metadata = {
  title: "Browse Homes",
  description:
    "Search verified student housing near Nigerian universities. Filter by budget, university, apartment type, and verification status.",
};

/** Faster than `searchParams[key]` once for each field. */
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PropertiesPage({
  searchParams: searchParamsPromise,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await searchParamsPromise;

  // Coerce the raw URL search params (all strings) into the typed shape
  // the API expects, so the first render already has the right data.
  const initialParams: Partial<SearchParamsType> = {};

  const query = first(searchParams?.query);
  if (query) initialParams.query = query;

  const university = first(searchParams?.university);
  if (university) initialParams.university = university;

  const type = first(searchParams?.type);
  if (type) initialParams.type = type as SearchParamsType["type"];

  const verifiedOnly = first(searchParams?.verifiedOnly);
  if (verifiedOnly) initialParams.verifiedOnly = verifiedOnly === "true";

  const minPrice = first(searchParams?.minPrice);
  if (minPrice) initialParams.minPrice = Number(minPrice);

  const maxPrice = first(searchParams?.maxPrice);
  if (maxPrice) initialParams.maxPrice = Number(maxPrice);

  const page = first(searchParams?.page);
  if (page) initialParams.page = Number(page);

  return <PropertySearch initialParams={initialParams} />;
}
