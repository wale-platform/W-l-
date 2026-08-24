import { PropertyStatus } from "@prisma/client";
import { z } from "zod";

import { universitySchema } from "../../lib/universities";
import { dateOnly, nigerianPhone } from "../../lib/zod-fields";
import { amenityTagSchema } from "./amenity-tags";

/**
 * Query schema for GET /properties.
 *
 * Mirrors the frontend `searchParamsSchema`, but values arrive as query-string
 * text, so numbers and booleans are coerced here. Blank strings are normalized
 * to `undefined` so an empty search box doesn't become a filter. Defaults match
 * the frontend (page 1, pageSize 12, max 50).
 */

const blankToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalText = z.preprocess(
  blankToUndefined,
  z.string().trim().min(1).optional(),
);

export const propertyTypeSchema = z.enum([
  "studio",
  "one_bedroom",
  "two_bedroom",
  "shared",
]);

/**
 * How results are ordered.
 *
 * A closed set rather than a `sortBy`/`direction` pair, so a client cannot ask
 * to order by a column that happens to exist. `newest` is the default and every
 * option breaks ties on `id`, which keeps pagination stable — without a total
 * order, two listings sharing a price can swap places between page 1 and page 2
 * and one of them is then never seen.
 */
export const propertySortSchema = z.enum(["newest", "price_asc", "price_desc"]);

export type PropertySort = z.infer<typeof propertySortSchema>;

/**
 * Amenity filter: a comma-separated list of tag ids, e.g. `water,security`.
 *
 * Comma-separated rather than a repeated `amenities[]` parameter because the
 * exact array encoding depends on the HTTP client's serializer and Express's
 * query parser agreeing, and a mismatch there fails silently — the filter is
 * simply ignored. One string has one meaning everywhere.
 *
 * Unknown ids are an error rather than being dropped. Quietly ignoring a tag we
 * do not recognise would widen the result set past what the person asked for and
 * present it as a match.
 */
const amenityTagList = z.preprocess((v) => {
  if (typeof v !== "string") return v;
  const ids = v
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return ids.length > 0 ? ids : undefined;
}, z.array(amenityTagSchema).max(20).optional());

export const listPropertiesQuerySchema = z.object({
  query: optionalText,
  university: z.preprocess(blankToUndefined, universitySchema.optional()),
  city: optionalText,
  state: optionalText,
  // Minimums, not exact counts: "2 bedrooms" as a filter means "at least 2".
  minBedrooms: z.coerce.number().int().min(0).max(20).optional(),
  minBathrooms: z.coerce.number().int().min(0).max(20).optional(),
  amenities: amenityTagList,
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  type: propertyTypeSchema.optional(),
  verifiedOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  sort: propertySortSchema.default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>;

export const propertyIdParamSchema = z.object({
  id: z.string().min(1),
});

/* ------------------------------------------------------------- Writes -- */

/** Enough photos for a real listing, few enough that a POST can't be a payload attack. */
const MAX_IMAGES = 15;

/**
 * An image location we are willing to store.
 *
 * `https://` (Cloudinary, in production) or a root-relative path (the local
 * mock imagery). Protocol-relative `//host/x` is rejected explicitly: it looks
 * root-relative but resolves to an arbitrary host, so allowing it would let a
 * listing pull images from anywhere.
 */
const imageUrl = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((v) => v.startsWith("https://") || (v.startsWith("/") && !v.startsWith("//")), {
    message: "Images must be an https:// URL or a root-relative path",
  });

/**
 * Every field a client may set on a listing.
 *
 * `status`, `source`, and `ownerId` are deliberately absent. All three are
 * trust signals — `status` decides whether a listing reads as verified,
 * `source: "wale"` reads as first-party, and `ownerId` decides who may edit it
 * — so they are derived on the server (see property.service.ts) and ignored if
 * a client sends them.
 */
const propertyWritableFields = z.object({
  title: z
    .string()
    .trim()
    .min(8, "Give the listing a title students can recognise it by")
    .max(140, "Title is too long"),
  description: z
    .string()
    .trim()
    .min(30, "Describe the place in at least a sentence or two")
    .max(5_000, "Description is too long"),
  // Annual rent in whole naira. The floor rejects obvious unit mistakes
  // (someone typing a monthly figure of 50); the ceiling is a sanity bound.
  price: z.coerce
    .number()
    .int("Rent must be a whole number of naira")
    .min(10_000, "That rent looks too low — enter the annual rent in naira")
    .max(1_000_000_000, "That rent looks too high"),
  type: propertyTypeSchema,
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(1).max(20),
  address: z.string().trim().min(5, "Enter the street address").max(300),
  city: z.string().trim().min(2, "Enter the city").max(120),
  state: z.string().trim().min(2, "Enter the state").max(120),
  neighborhood: z.string().trim().min(2).max(120).optional(),
  // A controlled id ("unilag"), not a display name. See lib/universities.ts:
  // the search filter matches this column exactly, so free text here would
  // produce a listing no university search can find.
  university: universitySchema.optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  amenities: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  availableDate: dateOnly,
  images: z.array(imageUrl).max(MAX_IMAGES).default([]),
  // The public contact shown on the listing. Optional because it falls back to
  // the creating account's own name and phone; a lawyer listing on a landlord's
  // behalf sends the landlord's details explicitly.
  contactName: z.string().trim().min(2).max(120).optional(),
  contactPhone: nigerianPhone.optional(),
  contactEmail: z.string().email("Invalid email address").toLowerCase().trim().optional(),
});

/** A map pin needs both halves; one alone would place the listing on the equator. */
const coordinatesPaired = (d: { latitude?: number; longitude?: number }) =>
  (d.latitude === undefined) === (d.longitude === undefined);

const COORDINATES_MESSAGE = {
  message: "Provide both latitude and longitude, or neither",
  path: ["longitude"],
};

export const createPropertySchema = propertyWritableFields.refine(
  coordinatesPaired,
  COORDINATES_MESSAGE,
);

/**
 * PATCH body: any subset of the same fields.
 *
 * `.partial()` leaves absent keys undefined rather than applying the create
 * defaults, so omitting `images` or `amenities` edits neither — it does not
 * silently wipe them. An empty body is rejected instead of being a no-op that
 * looks like a successful save.
 */
export const updatePropertySchema = propertyWritableFields
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: "Nothing to update",
  })
  .refine(coordinatesPaired, COORDINATES_MESSAGE);

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

/** Query for GET /properties/mine — the caller's own listings, any status. */
export const listMyPropertiesQuerySchema = z.object({
  status: z.nativeEnum(PropertyStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export type ListMyPropertiesQuery = z.infer<typeof listMyPropertiesQuerySchema>;

/**
 * Admin decision on a submitted listing.
 *
 * DRAFT is not offered: pushing someone's listing back to draft is not a
 * moderation outcome, and PENDING_VERIFICATION covers "look at this again".
 */
export const propertyStatusSchema = z.object({
  status: z.enum([
    PropertyStatus.PENDING_VERIFICATION,
    PropertyStatus.VERIFIED,
    PropertyStatus.REJECTED,
    PropertyStatus.SUSPENDED,
  ]),
});

export type PropertyStatusInput = z.infer<typeof propertyStatusSchema>;
