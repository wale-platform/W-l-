import { z } from "zod";

/**
 * Searchable amenity tags, derived from what the landlord actually wrote.
 *
 * `Property.amenities` is free text on purpose — "Borehole water", "Water tank",
 * "Water included" are all things a landlord genuinely wants to say, in their
 * own words, and the listing page shows them verbatim. But free text cannot be
 * filtered on: a checkbox for "Security" matching by equality would miss
 * "Estate security", "Security gate", "Security guard", and "CCTV", all of which
 * are in the catalogue today. A `hasEvery` filter over raw text would return
 * nothing and look like "no listings match", which is worse than having no
 * filter at all.
 *
 * So the free text stays for display, and `Property.amenityTags` holds the
 * canonical tags derived from it (see `deriveAmenityTags`). The filter matches
 * tags; the listing shows words. Derivation happens on every write, so a
 * landlord never has to know the vocabulary exists.
 *
 * The tag set is deliberately short. These are the questions a Nigerian student
 * actually asks before an inspection — is there water, is the meter prepaid, is
 * there power when the grid is down — not an exhaustive property taxonomy.
 *
 * Keywords are kept narrow rather than generous. A tag is a claim shown to a
 * student on the landlord's behalf, so a false positive is worse than a miss: a
 * listing surfacing under "Running water" because it mentioned a "well-lit
 * room" would be us inventing an amenity nobody offered.
 */

export interface AmenityTag {
  id: string;
  /** How the filter offers it. The frontend mirrors these labels. */
  label: string;
  /**
   * Lowercased substrings that mean this tag. Matched against each amenity
   * string, so "gate" catches both "Security gate" and "Gated compound".
   */
  keywords: readonly string[];
}

export const AMENITY_TAGS: readonly AmenityTag[] = [
  {
    id: "water",
    label: "Running water",
    keywords: ["water", "borehole"],
  },
  {
    id: "prepaid_meter",
    label: "Prepaid meter",
    keywords: ["prepaid", "pre-paid"],
  },
  {
    id: "backup_power",
    label: "Backup power",
    keywords: ["generator", "inverter", "solar", "backup power"],
  },
  {
    id: "security",
    label: "Security",
    keywords: ["security", "cctv", "guard", "gate", "fenced"],
  },
  {
    id: "parking",
    label: "Parking",
    keywords: ["parking", "car park", "garage"],
  },
  {
    id: "furnished",
    label: "Furnished",
    keywords: ["furnished", "wardrobe", "fitted kitchen"],
  },
  {
    id: "internet",
    label: "Internet",
    keywords: ["internet", "wifi", "wi-fi", "fibre", "fiber", "broadband"],
  },
  {
    id: "ensuite",
    label: "En-suite bathroom",
    keywords: ["en-suite", "ensuite", "en suite"],
  },
] as const;

const AMENITY_TAG_IDS = AMENITY_TAGS.map((t) => t.id) as [string, ...string[]];

export const amenityTagSchema = z.enum(AMENITY_TAG_IDS, {
  errorMap: () => ({ message: "Unknown amenity filter" }),
});

/**
 * Map free-text amenities onto the tag vocabulary.
 *
 * Order follows `AMENITY_TAGS` rather than the input, so two listings that say
 * the same things in a different order get identical tags — which keeps the
 * column comparable and makes the backfill idempotent.
 */
export function deriveAmenityTags(amenities: readonly string[]): string[] {
  const haystack = amenities.map((a) => a.toLowerCase());

  return AMENITY_TAGS.filter((tag) =>
    haystack.some((amenity) => tag.keywords.some((keyword) => amenity.includes(keyword))),
  ).map((tag) => tag.id);
}
