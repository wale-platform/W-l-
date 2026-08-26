import { z } from "zod";

import { universities, type UniversityId } from "@/config/site";

/**
 * Zod schemas are the single source of truth for data shapes.
 *
 * TS types are inferred from them rather than duplicated, so adding a
 * field to the schema automatically makes it visible to every consumer.
 * The API client parses every response at the boundary, so a backend
 * change that breaks the contract fails loudly rather than silently
 * passing malformed data into the UI.
 */

/* --------------------------------------------------- shared field rules -- */

/**
 * Nigerian mobile number in the formats people actually type — 08012345678,
 * +2348012345678, 0801 234 5678. The backend normalizes to +234XXXXXXXXXX; we
 * only validate here and let it do the normalizing, so there is one canonical
 * implementation of the transform.
 *
 * Shared by signup and the listing contact fields, mirroring
 * `backend/src/lib/zod-fields.ts` — a number is a number wherever it is typed.
 */
const phoneField = z
  .string()
  .trim()
  .refine((v) => /^(\+?234|0)?[789][01]\d{8}$/.test(v.replace(/[\s()-]/g, "")), {
    message: "Enter a valid Nigerian phone number, e.g. 08012345678",
  });

/**
 * A university WALE covers, identified by the id in `config/site.ts` — never a
 * display name.
 *
 * The column is matched by exact equality, so a listing stored as "University
 * of Lagos" can never be found by the filter that sends `unilag`. Making this a
 * closed set means the landlord form can only offer values the search can match,
 * and the backend rejects anything else (`backend/src/lib/universities.ts`).
 * The two lists are asserted to line up by `scripts/verify-property-contract.mts`.
 *
 * Derived from the config so adding a university stays a one-line change.
 */
const universityIds = universities.map((u) => u.id) as [UniversityId, ...UniversityId[]];

export const universityIdSchema = z.enum(universityIds, {
  errorMap: () => ({ message: "Choose one of the universities WALE covers" }),
});

/* ---------------------------------------------------------------- User -- */

/**
 * Roles as the backend emits them (Prisma `Role` enum). The UI maps these to
 * human labels — it must not invent its own vocabulary, or every real user
 * fails to parse.
 */
export const roleSchema = z.enum(["TENANT", "LANDLORD", "LAWYER", "MOVER", "ADMIN"]);

export type Role = z.infer<typeof roleSchema>;

/** Display labels for roles, kept next to the enum so they cannot drift. */
export const roleLabels: Record<Role, string> = {
  TENANT: "Tenant",
  LANDLORD: "Landlord",
  LAWYER: "Lawyer",
  MOVER: "Mover",
  ADMIN: "Administrator",
};

/**
 * Roles a person may choose at signup. LAWYER and ADMIN are deliberately
 * absent: they confer trust and power, so an administrator grants them. The
 * backend rejects them independently — this list only keeps them out of the UI.
 */
export const signupRoleSchema = z.enum(["TENANT", "LANDLORD", "MOVER"]);

export type SignupRole = z.infer<typeof signupRoleSchema>;

/** What each signup role means, shown on the role picker. */
export const signupRoleCopy: Record<SignupRole, { label: string; blurb: string }> = {
  TENANT: {
    label: "I'm looking for a home",
    blurb: "Search verified listings, book inspections, and rent with confidence.",
  },
  LANDLORD: {
    label: "I have property to let",
    blurb: "List your property, get it verified, and reach serious tenants.",
  },
  MOVER: {
    label: "I've lived somewhere before",
    blurb: "Share your honest experience of places you've rented to help others.",
  },
};

/** The default dashboard for a given primary role. */
export const roleHomePath: Record<Role, string> = {
  TENANT: "/tenant",
  LANDLORD: "/landlord",
  LAWYER: "/lawyer",
  MOVER: "/tenant",
  ADMIN: "/admin",
};

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  // Computed server-side as "firstName lastName"; the split fields are also
  // returned and are useful for pre-filling profile forms.
  name: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().nullable().optional(),
  /** Primary role — decides the default dashboard. Do NOT authorize against it. */
  role: roleSchema,
  /**
   * Every role the account holds, including the primary. One person can be a
   * tenant and a mover at once, so anything role-gated reads this, not `role`.
   * Optional for resilience against an older backend that predates it.
   */
  roles: z.array(roleSchema).optional(),
  university: z.string().nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  emailVerified: z.boolean().optional(),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

/** Every role the user holds, falling back to the primary if `roles` is absent. */
export function heldRoles(user: User): Role[] {
  return user.roles?.length ? user.roles : [user.role];
}

/** True if the user holds any of `allowed`. Convenience, not a security boundary. */
export function hasAnyRole(user: User, allowed: readonly Role[]): boolean {
  return heldRoles(user).some((role) => allowed.includes(role));
}

/* ------------------------------------------------------------ Property -- */

/**
 * Apartment types, as the Prisma `PropertyType` enum spells them. One list,
 * reused by the response schema, the listing form, and the search filter — a
 * fourth copy is a fourth chance to offer a value the API rejects.
 */
export const PROPERTY_TYPES = ["studio", "one_bedroom", "two_bedroom", "shared"] as const;

export const propertyTypeSchema = z.enum(PROPERTY_TYPES);

export type PropertyType = z.infer<typeof propertyTypeSchema>;

export const propertySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  type: propertyTypeSchema,
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(1),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  university: z.string().optional(),
  verified: z.boolean(),
  availableDate: z.string(),
  // Either an absolute CDN URL (Cloudinary, in production) or a root-relative
  // path (the local mock imagery), so `.url()` would be wrong here.
  images: z.array(z.string().min(1)),
  amenities: z.array(z.string()),
  coordinates: z
    .object({
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  source: z.enum(["wale", "agent", "landlord"]),
  landlord: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string().email().optional(),
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Property = z.infer<typeof propertySchema>;

export const propertyListResponseSchema = z.object({
  properties: z.array(propertySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export type PropertyListResponse = z.infer<typeof propertyListResponseSchema>;

/* --------------------------------------------- Property, as its owner sees it -- */

/**
 * The listing lifecycle (Prisma `PropertyStatus`).
 *
 * Only the owner and admins ever see this. The public catalogue exposes
 * `verified: boolean` instead, because "this listing is in review" is the
 * owner's business, not a shopper's.
 */
export const propertyStatusSchema = z.enum([
  "DRAFT",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "REJECTED",
  "SUSPENDED",
]);

export type PropertyStatus = z.infer<typeof propertyStatusSchema>;

/**
 * How each state reads to the landlord, kept next to the enum so the label, the
 * colour, and the explanation cannot drift apart.
 *
 * The hints describe what the backend actually does: PENDING_VERIFICATION is
 * publicly listable (see `PUBLICLY_LISTABLE` in property.service.ts), so a
 * listing in review is already reaching students — saying otherwise would be a
 * lie the UI tells on the server's behalf.
 */
export const propertyStatusCopy: Record<
  PropertyStatus,
  { label: string; tone: "neutral" | "warning" | "success" | "danger"; hint: string }
> = {
  DRAFT: {
    label: "Draft",
    tone: "neutral",
    hint: "Only you can see this. Send it for review when the details are complete.",
  },
  PENDING_VERIFICATION: {
    label: "In review",
    tone: "warning",
    hint: "Students can see it while our team checks the details, but it carries no verified badge yet.",
  },
  VERIFIED: {
    label: "Verified",
    tone: "success",
    hint: "Live, and showing the verified badge to students.",
  },
  REJECTED: {
    label: "Needs changes",
    tone: "danger",
    hint: "Something didn't check out. Update the details and send it back for review.",
  },
  SUSPENDED: {
    label: "Suspended",
    tone: "danger",
    hint: "Taken down by our team. Get in touch with support to sort it out.",
  },
};

/**
 * `GET /properties/mine` — the public payload plus what only an owner sees.
 *
 * An owner has to be able to tell "still a draft" from "waiting on review" from
 * "rejected"; `verified: false` collapses all three into one. `neighborhood` is
 * here rather than on the public schema because the public payload has no field
 * for it, and the edit form has to show what was saved.
 *
 * `statusReason` is the reviewer's own words about THIS status, and the server
 * withholds it when the newest decision no longer explains where the listing is
 * — so if it is absent, there is genuinely nothing to show, and the UI must not
 * fill the gap with a guess of its own.
 */
export const ownerPropertySchema = propertySchema.extend({
  status: propertyStatusSchema,
  neighborhood: z.string().optional(),
  statusReason: z.string().optional(),
  statusChangedAt: z.string().optional(),
});

export type OwnerProperty = z.infer<typeof ownerPropertySchema>;

export const ownerPropertyListResponseSchema = z.object({
  properties: z.array(ownerPropertySchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export type OwnerPropertyListResponse = z.infer<typeof ownerPropertyListResponseSchema>;

export const myPropertiesParamsSchema = z.object({
  status: propertyStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(12),
});

export type MyPropertiesParams = z.infer<typeof myPropertiesParamsSchema>;

/* ------------------------------------------------------ Review & audit -- */

/**
 * `GET /properties/review-queue` — what an admin has waiting.
 *
 * The same owner payload, because reviewing a listing means seeing everything
 * its owner sees, including the last decision made on it.
 */
export const reviewQueueParamsSchema = z.object({
  status: propertyStatusSchema.default("PENDING_VERIFICATION"),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(12),
});

export type ReviewQueueParams = z.infer<typeof reviewQueueParamsSchema>;

/**
 * The decision an admin sends to `PATCH /properties/:id/status`.
 *
 * DRAFT is not offered: pushing someone's listing back to draft is not a
 * moderation outcome. `reason` is required for the two punitive outcomes — the
 * server enforces the same rule, and this copy exists so the reviewer finds out
 * before they submit rather than after.
 *
 * The message says the landlord reads it word for word, because they do. A
 * reviewer who knows that writes something the landlord can act on.
 */
const DECISION_NEEDS_REASON: PropertyStatus[] = ["REJECTED", "SUSPENDED"];

export const propertyDecisionSchema = z
  .object({
    status: z.enum(["PENDING_VERIFICATION", "VERIFIED", "REJECTED", "SUSPENDED"]),
    reason: z.string().trim().max(1000).optional(),
  })
  .superRefine((body, ctx) => {
    if (DECISION_NEEDS_REASON.includes(body.status) && (body.reason ?? "").length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message:
          body.status === "REJECTED"
            ? "Say what the landlord needs to change — they see this word for word"
            : "Say why it is being taken down — the landlord sees this word for word",
      });
    }
  });

export type PropertyDecision = z.infer<typeof propertyDecisionSchema>;

/**
 * One row of `GET /properties/:id/history` — a status change and who made it.
 *
 * `actor` is nullable twice over: a decision predating the audit trail has no
 * actor on record, and deleting an admin's account nulls the link rather than
 * erasing the decision. Either way the change itself still happened, so the UI
 * shows it without a name rather than dropping the row.
 */
export const verificationEntrySchema = z.object({
  id: z.string(),
  fromStatus: propertyStatusSchema,
  toStatus: propertyStatusSchema,
  reason: z.string().nullable(),
  actor: z.object({ id: z.string(), name: z.string() }).nullable(),
  createdAt: z.string(),
});

export type VerificationEntry = z.infer<typeof verificationEntrySchema>;

export const verificationHistoryResponseSchema = z.object({
  history: z.array(verificationEntrySchema),
});

/* ------------------------------------------ Property, as its owner writes it -- */

/**
 * The listing form, mirroring `propertyWritableFields` in
 * `backend/src/modules/properties/property.schemas.ts`.
 *
 * Duplicated deliberately, exactly like the password policy below: this copy
 * gives instant feedback while someone types, the server copy is the one that
 * actually protects anything. The bounds are kept identical so the form never
 * accepts something the server is going to reject.
 *
 * Every field's INPUT is a string, because that is what an `<input>` hands you;
 * the OUTPUT is the JSON the API wants. So the form is typed on
 * `PropertyFormValues` (strings) and the submit handler receives
 * `PropertyPayload` (numbers, arrays) — one schema doing the conversion, rather
 * than a second hand-written mapper that can disagree with it.
 *
 * `status`, `source`, and `ownerId` are absent on purpose: they are trust
 * signals the server derives, and sending them accomplishes nothing.
 *
 * `images` IS part of the schema, but it is the one field no `<input>` fills in:
 * photos go straight from the browser to Cloudinary and what comes back is a
 * list of URLs (see `mediaApi.uploadImage`). It lives here anyway, because the
 * form submits it and the server validates it — keeping it out would mean a
 * hand-written mapper merging it in, which is the drift this schema exists to
 * prevent.
 */

/** Matches the backend's own cap, so the form cannot offer a 16th photo. */
export const MAX_PROPERTY_IMAGES = 15;

/** An empty box means "not provided", which is not the same as an empty value. */
function optionalField<T extends z.ZodTypeAny>(schema: T) {
  return z
    .string()
    .trim()
    .transform((v) => (v === "" ? undefined : v))
    .pipe(schema.optional());
}

/**
 * A whole number typed into a text box. Both "" and "12a" mean "not a number
 * yet" and share one message — `z.coerce.number()` would report them as
 * "expected number, received nan", which is not something to show a landlord.
 */
function wholeNumberField(rules: {
  blank: string;
  min: [number, string];
  max: [number, string];
}) {
  return z
    .string()
    .trim()
    .min(1, rules.blank)
    .refine((v) => /^\d+$/.test(v), rules.blank)
    .transform(Number)
    .refine((n) => n >= rules.min[0], rules.min[1])
    .refine((n) => n <= rules.max[0], rules.max[1]);
}

export const propertyFormSchema = z.object({
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
  price: wholeNumberField({
    blank: "Enter the annual rent in naira, digits only",
    min: [10_000, "That rent looks too low — enter the annual rent, not the monthly"],
    max: [1_000_000_000, "That rent looks too high"],
  }),
  type: z.enum(PROPERTY_TYPES, {
    errorMap: () => ({ message: "Choose the apartment type" }),
  }),
  bedrooms: wholeNumberField({
    blank: "Enter the number of bedrooms",
    min: [0, "Bedrooms cannot be negative"],
    max: [20, "That is more bedrooms than we can list"],
  }),
  bathrooms: wholeNumberField({
    blank: "Enter the number of bathrooms",
    min: [1, "A place needs at least one bathroom"],
    max: [20, "That is more bathrooms than we can list"],
  }),
  address: z.string().trim().min(5, "Enter the street address").max(300, "Address is too long"),
  city: z.string().trim().min(2, "Enter the city").max(120, "City is too long"),
  state: z.string().trim().min(2, "Enter the state").max(120, "State is too long"),
  neighborhood: optionalField(
    z.string().min(2, "Enter a real area name").max(120, "Area name is too long"),
  ),
  university: optionalField(universityIdSchema),
  // `<input type="date">` already guarantees a real calendar date, but the value
  // can also be typed by hand, and "2026-02-31" parses to March 3rd rather than
  // failing. The round-trip is the check.
  availableDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the date the place becomes available")
    .refine((v) => new Date(`${v}T00:00:00.000Z`).toISOString().startsWith(v), {
      message: "That date does not exist",
    }),
  amenities: z
    .string()
    .transform((v) =>
      v
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    )
    .refine((list) => list.length <= 30, "Keep it to 30 amenities or fewer")
    .refine(
      (list) => list.every((item) => item.length <= 60),
      "Each amenity should be a short phrase, not a paragraph",
    ),
  /**
   * Photo URLs, in display order — the first one is the cover.
   *
   * Already-uploaded locations, not files: `ImageUploader` sends each file to
   * Cloudinary and appends the URL it gets back. A photoless listing is allowed
   * here because the backend allows a photoless DRAFT; it is submitting for
   * review that requires a photo, and that rule is enforced there.
   */
  images: z
    .array(z.string().min(1))
    .max(MAX_PROPERTY_IMAGES, `Keep it to ${MAX_PROPERTY_IMAGES} photos or fewer`),
  // The contact published ON the listing. Left blank, the server falls back to
  // the creating account's own name and phone — which is what a landlord
  // listing their own place wants. A lawyer acting for a landlord fills these
  // in, so students reach the landlord and not the lawyer.
  contactName: optionalField(
    z.string().min(2, "Enter the full name").max(120, "Name is too long"),
  ),
  contactPhone: optionalField(phoneField),
  contactEmail: optionalField(z.string().email("Invalid email address")),
});

/** What the inputs hold — every field a string. */
export type PropertyFormValues = z.input<typeof propertyFormSchema>;

/** What the API receives once the schema has parsed it. */
export type PropertyPayload = z.output<typeof propertyFormSchema>;

/**
 * Turn a saved listing back into form values.
 *
 * The inverse of what the schema does on submit — numbers become strings,
 * amenities become one comma-separated line — so an edit starts from exactly
 * what is stored. The contact fields come from `landlord`, which is where the
 * server publishes them; they are already concrete values by then (the server
 * resolves the profile fallback at create time), so round-tripping them changes
 * nothing.
 *
 * Lives here rather than in the form component because it is pure data and the
 * round trip is a contract claim: `propertyFormSchema.parse(propertyFormValuesFrom(p))`
 * must succeed for anything the API returns, or the edit form would open with
 * errors on fields nobody touched. `scripts/verify-property-contract.mts` asserts
 * exactly that against a real response.
 */
export function propertyFormValuesFrom(property: OwnerProperty): PropertyFormValues {
  return {
    title: property.title,
    description: property.description,
    price: String(property.price),
    type: property.type,
    bedrooms: String(property.bedrooms),
    bathrooms: String(property.bathrooms),
    address: property.address,
    city: property.city,
    state: property.state,
    neighborhood: property.neighborhood ?? "",
    university: property.university ?? "",
    availableDate: property.availableDate,
    amenities: property.amenities.join(", "),
    // Restored, not dropped: the form always sends `images`, so opening an edit
    // without them and saving would delete the listing's whole gallery.
    images: property.images,
    contactName: property.landlord.name,
    contactPhone: property.landlord.phone,
    contactEmail: property.landlord.email ?? "",
  };
}

/* ---------------------------------------------------------- Search/Filter -- */

/**
 * How results are ordered. Mirrors the backend's `propertySortSchema`.
 *
 * A closed set, so the client cannot ask to order by an arbitrary column, and
 * the labels live next to the values so the `<Select>` cannot offer an option
 * the API would reject.
 */
export const propertySortSchema = z.enum(["newest", "price_asc", "price_desc"]);

export type PropertySort = z.infer<typeof propertySortSchema>;

export const propertySortOptions: { value: PropertySort; label: string }[] = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Cheapest first" },
  { value: "price_desc", label: "Most expensive first" },
];

/**
 * Searchable amenity tags. Mirrors `AMENITY_TAGS` in the backend's
 * `src/modules/properties/amenity-tags.ts`, which is the source of truth: the
 * server derives these from the landlord's own wording and rejects an id it does
 * not know, so an option added here alone would 422 rather than silently return
 * everything.
 */
export const amenityTagSchema = z.enum([
  "water",
  "prepaid_meter",
  "backup_power",
  "security",
  "parking",
  "furnished",
  "internet",
  "ensuite",
]);

export type AmenityTag = z.infer<typeof amenityTagSchema>;

export const amenityTagOptions: { value: AmenityTag; label: string }[] = [
  { value: "water", label: "Running water" },
  { value: "prepaid_meter", label: "Prepaid meter" },
  { value: "backup_power", label: "Backup power" },
  { value: "security", label: "Security" },
  { value: "parking", label: "Parking" },
  { value: "furnished", label: "Furnished" },
  { value: "internet", label: "Internet" },
  { value: "ensuite", label: "En-suite bathroom" },
];

/**
 * Everything the catalogue can be narrowed or ordered by.
 *
 * `amenities` is serialized as one comma-separated string rather than a repeated
 * parameter, because the array encoding has to survive axios's serializer and
 * Express's query parser agreeing with each other, and when they don't the filter
 * is silently dropped. See the matching note on the backend schema.
 */
export const searchParamsSchema = z.object({
  query: z.string().optional(),
  /**
   * A university id ("unilag"), never a display name — the column is matched by
   * equality. Callers reading it off a URL should `safeParse` first and drop an
   * unknown value, so a hand-edited link degrades to "any university" instead of
   * throwing (the `<Select>` then shows the filter as not applied, which is true).
   */
  university: universityIdSchema.optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  minBedrooms: z.number().int().min(0).max(20).optional(),
  minBathrooms: z.number().int().min(0).max(20).optional(),
  amenities: z
    .array(amenityTagSchema)
    .optional()
    .transform((tags) => (tags?.length ? tags.join(",") : undefined)),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  type: propertyTypeSchema.optional(),
  verifiedOnly: z.boolean().optional(),
  sort: propertySortSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(12),
});

/** What callers pass in — `amenities` is still an array at this point. */
export type SearchParams = z.input<typeof searchParamsSchema>;

/** What goes on the wire, after `amenities` is joined. */
export type SearchQuery = z.output<typeof searchParamsSchema>;

/* -------------------------------------------------------- Inspections -- */

/**
 * Where a viewing request has got to (Prisma `InspectionStatus`).
 *
 * REQUESTED and CONFIRMED are the live ones — the only two a landlord can still
 * act on, and the only two that stop the same tenant asking about the same place
 * again. The other three are closed: DECLINED and COMPLETED by the landlord,
 * CANCELLED by the tenant.
 */
export const inspectionStatusSchema = z.enum([
  "REQUESTED",
  "CONFIRMED",
  "DECLINED",
  "CANCELLED",
  "COMPLETED",
]);

export type InspectionStatus = z.infer<typeof inspectionStatusSchema>;

/**
 * How each state reads, kept next to the enum so the label and the colour cannot
 * drift from it.
 *
 * Both sides of a request see the same row, so the wording has to be true from
 * either chair. "Awaiting reply" works for the tenant who is waiting and the
 * landlord who owes one; "Awaiting your reply" would be a lie on one of the two
 * dashboards.
 */
export const inspectionStatusCopy: Record<
  InspectionStatus,
  { label: string; tone: "neutral" | "warning" | "success" | "danger" }
> = {
  REQUESTED: { label: "Awaiting reply", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  DECLINED: { label: "Declined", tone: "danger" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  COMPLETED: { label: "Viewed", tone: "neutral" },
};

/**
 * Just enough of the listing to identify it in a row of requests.
 *
 * `image` is not `.url()`: the first-party imagery is stored root-relative
 * (`/listings/listing-01.jpg`) and only Cloudinary uploads are absolute, so
 * demanding a URL here would fail to parse half the catalogue.
 */
const inspectionListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  price: z.number(),
  image: z.string().optional(),
});

/**
 * A viewing request as the person who asked sees it.
 *
 * Every optional field is genuinely absent rather than null when there is
 * nothing to show — the server omits them (see `inspection.serializer.ts`), so
 * `note === undefined` means "they did not leave one", not "we lost it".
 */
export const inspectionSchema = z.object({
  id: z.string(),
  status: inspectionStatusSchema,
  preferredAt: z.string(),
  note: z.string().optional(),
  response: z.string().optional(),
  respondedAt: z.string().optional(),
  createdAt: z.string(),
  property: inspectionListingSchema,
});

export type Inspection = z.infer<typeof inspectionSchema>;

/**
 * The same request as the listing's owner sees it: with a name to expect at the
 * gate.
 *
 * `tenant.phone` is optional because the server only sends it once the landlord
 * has CONFIRMED — before that a request is just an ask, and a stream of them
 * would otherwise be a stream of students' phone numbers to whoever posts a
 * listing. So this optional field is the only thing that decides whether the UI
 * has a number to show; it must never substitute one from anywhere else.
 */
export const landlordInspectionSchema = inspectionSchema.extend({
  tenant: z.object({
    id: z.string(),
    name: z.string(),
    phone: z.string().optional(),
  }),
});

export type LandlordInspection = z.infer<typeof landlordInspectionSchema>;

export const inspectionListResponseSchema = z.object({
  inspections: z.array(inspectionSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export type InspectionListResponse = z.infer<typeof inspectionListResponseSchema>;

export const landlordInspectionListResponseSchema = inspectionListResponseSchema.extend({
  inspections: z.array(landlordInspectionSchema),
});

export type LandlordInspectionListResponse = z.infer<
  typeof landlordInspectionListResponseSchema
>;

/**
 * `GET /inspections/properties/:id/mine` — have I already asked about this one?
 *
 * `null` is a successful answer, not a missing resource: "you have not asked to
 * view this" is exactly what the listing page's button needs to know.
 */
export const myInspectionResponseSchema = z.object({
  inspection: inspectionSchema.nullable(),
});

export const inspectionListParamsSchema = z.object({
  status: inspectionStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export type InspectionListParams = z.infer<typeof inspectionListParamsSchema>;

/**
 * What a tenant sends to ask for a viewing, mirroring
 * `backend/src/modules/inspections/inspection.schemas.ts`.
 *
 * The horizon is the server's, restated so a typo'd year is caught on the field
 * rather than as a 422. The floor here is stricter than the server's by a few
 * minutes: the server allows a little clock slack so a slow connection is not
 * punished, but a form should never let someone *pick* a time that has passed.
 *
 * `note` is trimmed to `undefined` when blank, because the server requires at
 * least one character if the field is present at all — an empty textarea must
 * send nothing, not `""`.
 */
const VIEWING_HORIZON_DAYS = 90;

export const createInspectionSchema = z.object({
  preferredAt: z
    .string()
    .trim()
    .datetime({ offset: true, message: "Pick a date and time for the viewing" })
    .refine((v) => new Date(v).getTime() > Date.now(), {
      message: "Pick a time in the future",
    })
    .refine((v) => new Date(v).getTime() < Date.now() + VIEWING_HORIZON_DAYS * 86_400_000, {
      message: `Pick a time within the next ${VIEWING_HORIZON_DAYS} days`,
    }),
  note: z
    .string()
    .trim()
    .max(500, "Keep this under 500 characters")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type CreateInspectionInput = z.input<typeof createInspectionSchema>;

/**
 * The landlord's answer to a request.
 *
 * Three reachable states and no more. REQUESTED is absent because un-answering
 * a request would leave the tenant holding a confirmation they can no longer
 * rely on, and CANCELLED is absent because that belongs to the tenant — a
 * landlord declines.
 *
 * DECLINED needs words. The tenant is shown them verbatim, and "declined" on its
 * own leaves them unable to tell whether to propose another time or give up on
 * the place. The server enforces the same floor; this copy exists so the landlord
 * finds out before they submit.
 */
export const inspectionDecisionSchema = z
  .object({
    status: z.enum(["CONFIRMED", "DECLINED", "COMPLETED"]),
    response: z
      .string()
      .trim()
      .max(1000, "Keep this under 1000 characters")
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine((body, ctx) => {
    if (body.status === "DECLINED" && (body.response ?? "").length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["response"],
        message: "Say why, or suggest another time — the tenant sees this word for word",
      });
    }
  });

export type InspectionDecision = z.infer<typeof inspectionDecisionSchema>;

/* --------------------------------------------------------- Residences -- */

/**
 * Where a residence claim has got to (Prisma `ResidenceStatus`).
 *
 * Three states and no more. UNVERIFIED is the only one a claim can be created in,
 * and the only one the claimant can still withdraw from.
 */
export const residenceStatusSchema = z.enum(["UNVERIFIED", "CONFIRMED", "REJECTED"]);

export type ResidenceStatus = z.infer<typeof residenceStatusSchema>;

/**
 * How each state reads.
 *
 * "Awaiting the landlord" rather than "Unverified" for UNVERIFIED, because the word
 * a claimant needs is what is happening, not the column's name. The tone is
 * `warning` rather than `danger`: an unconfirmed claim is not a rejected one, and
 * the review written from it is published — labelled, and excluded from the
 * verified average, but published.
 */
export const residenceStatusCopy: Record<
  ResidenceStatus,
  { label: string; tone: "neutral" | "warning" | "success" | "danger" }
> = {
  UNVERIFIED: { label: "Awaiting the landlord", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "success" },
  REJECTED: { label: "Not accepted", tone: "danger" },
};

/**
 * Just enough of the listing to recognise which flat this was.
 *
 * No `price`, unlike `inspectionListingSchema`. A residence claim is about the
 * past; what the place costs today is somebody else's business and the server does
 * not send it.
 */
const residenceListingSchema = z.object({
  id: z.string(),
  title: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  image: z.string().optional(),
});

/**
 * A claim as the person who made it sees it.
 *
 * `movedOutAt` absent means "still living there" — a real answer, and one that
 * still entitles them to review the place.
 *
 * `verified` is the server's `status === "CONFIRMED"`, recomputed on every read
 * rather than stored, so it can never say "verified" about a claim that has since
 * been rejected. Read it; never re-derive it from something else here.
 */
export const residenceSchema = z.object({
  id: z.string(),
  status: residenceStatusSchema,
  verified: z.boolean(),
  movedInAt: z.string(),
  movedOutAt: z.string().optional(),
  note: z.string().optional(),
  /** The owner's words when they refused. Shown to the claimant verbatim. */
  decisionReason: z.string().optional(),
  decidedAt: z.string().optional(),
  createdAt: z.string(),
  property: residenceListingSchema,
  /** Whether a review has been written for this period yet. Decides the button. */
  hasReview: z.boolean(),
});

export type Residence = z.infer<typeof residenceSchema>;

/**
 * The same claim as the property's owner sees it, with who is claiming.
 *
 * No phone number and no email, deliberately, and unlike a confirmed viewing
 * request. The owner is answering "do I recognise this person and these dates",
 * which a name, a period and a note answer completely — so the server sends no way
 * to contact them and this schema has no field to put one in.
 *
 * `corroborated` is true when the platform holds a COMPLETED viewing by this person
 * on this property: real evidence they physically turned up. It is a snapshot taken
 * when the claim was made, so a viewing marked as done afterwards will not appear.
 */
export const ownerResidenceSchema = residenceSchema.extend({
  claimant: z.object({ id: z.string(), name: z.string() }),
  corroborated: z.boolean(),
});

export type OwnerResidence = z.infer<typeof ownerResidenceSchema>;

export const residenceListResponseSchema = z.object({
  residences: z.array(residenceSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export type ResidenceListResponse = z.infer<typeof residenceListResponseSchema>;

export const ownerResidenceListResponseSchema = residenceListResponseSchema.extend({
  residences: z.array(ownerResidenceSchema),
});

export type OwnerResidenceListResponse = z.infer<typeof ownerResidenceListResponseSchema>;

export const residenceListParamsSchema = z.object({
  status: residenceStatusSchema.optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
});

export type ResidenceListParams = z.infer<typeof residenceListParamsSchema>;

/**
 * What a claimant sends to record a place they lived, mirroring
 * `backend/src/modules/residences/residence.schemas.ts`.
 *
 * Calendar dates, not timestamps: nobody remembers the hour they moved in, and a
 * timestamp would buy a timezone bug in exchange for precision the underlying fact
 * does not have.
 *
 * The bounds are the server's, restated so a typo'd year lands on the field rather
 * than coming back as a 422. An empty `movedOutAt` is how "still living here" is
 * spelled, so the field transforms blank to `undefined` — sending `""` would be a
 * second spelling of the same thing.
 */
const CLAIM_EARLIEST_YEARS = 30;

/** Today at UTC midnight, matching how the server parses `YYYY-MM-DD`. */
function todayUtcDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** A `YYYY-MM-DD` string as the UTC-midnight instant the server will read it as. */
function parseDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  // Round-trip, so "2025-02-31" is rejected rather than silently becoming March.
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value
    ? null
    : parsed;
}

const claimDate = z
  .string()
  .trim()
  .refine((v) => parseDateOnly(v) !== null, { message: "Use the date picker" });

export const createResidenceSchema = z
  .object({
    propertyId: z.string().min(1, "Choose which place you lived in"),
    movedInAt: claimDate,
    movedOutAt: claimDate.optional().or(z.literal("")).transform((v) => (v ? v : undefined)),
    note: z
      .string()
      .trim()
      .max(500, "Keep this under 500 characters")
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine((body, ctx) => {
    const movedIn = parseDateOnly(body.movedInAt);
    if (!movedIn) return;
    const today = todayUtcDate();

    if (movedIn > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["movedInAt"],
        message: "This is your residence history — pick a date you have already moved in on",
      });
    }

    const earliest = new Date(today);
    earliest.setUTCFullYear(earliest.getUTCFullYear() - CLAIM_EARLIEST_YEARS);
    if (movedIn < earliest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["movedInAt"],
        message: `Pick a date within the last ${CLAIM_EARLIEST_YEARS} years`,
      });
    }

    const movedOut = body.movedOutAt ? parseDateOnly(body.movedOutAt) : null;
    if (!movedOut) return;

    if (movedOut < movedIn) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["movedOutAt"],
        message: "You cannot have moved out before you moved in",
      });
    }
    if (movedOut > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["movedOutAt"],
        message: "Leave this empty if you still live here",
      });
    }
  });

/** What the form holds. `movedOutAt` is `""` while empty; the schema drops it. */
export type CreateResidenceInput = z.input<typeof createResidenceSchema>;

/**
 * The owner's refusal, in their own words.
 *
 * Required, with a floor, because the claimant reads it verbatim and "Rejected" on
 * its own does not tell them whether they picked the wrong listing off a search
 * page or are being accused of making it up.
 *
 * Confirming has no schema at all — it takes no body. The asymmetry is the rule, so
 * it is two shapes rather than one with a status field.
 */
export const rejectResidenceSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Say why — the person who made this claim sees this word for word")
    .max(1000, "Keep this under 1000 characters"),
});

export type RejectResidenceInput = z.infer<typeof rejectResidenceSchema>;

/* ------------------------------------------- Lived-experience reviews -- */

/**
 * What it was actually like to live somewhere.
 *
 * Not to be confused with the "Review & audit" section above, which is an admin
 * reviewing a LISTING. This is a former tenant reviewing a HOME, and the two share
 * only the English word — hence `reviewListParamsSchema` here and
 * `reviewQueueParamsSchema` there.
 *
 * The rule the whole domain hangs off: a review belongs to a residence claim, and
 * only a claim the property's owner CONFIRMED counts towards the property's rating.
 * An unconfirmed claim still gets a voice — published, labelled, and excluded from
 * the average — because the person who decides whether to confirm is the person
 * being reviewed, and silence would be their mute button.
 */

/** Where a review stands with moderation (Prisma `ReviewStatus`). */
export const reviewStatusSchema = z.enum(["PUBLISHED", "HIDDEN", "REMOVED"]);

export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

/**
 * How each state reads to the person who wrote it.
 *
 * Only ever shown to the author — a stranger never sees a hidden review at all, so
 * there is no public use for this map. PUBLISHED is `success` rather than `neutral`
 * because it appears beside the other two, where "your review is up" is the reassuring
 * answer and not the boring one.
 */
export const reviewStatusCopy: Record<
  ReviewStatus,
  { label: string; tone: "success" | "warning" | "danger" }
> = {
  PUBLISHED: { label: "Published", tone: "success" },
  HIDDEN: { label: "Hidden by an admin", tone: "warning" },
  REMOVED: { label: "Taken down", tone: "danger" },
};

/** The five scores, all 1–5. Never averaged in the browser — see `ExperienceSummary`. */
export const reviewRatingsSchema = z.object({
  overall: z.number().int(),
  water: z.number().int(),
  power: z.number().int(),
  security: z.number().int(),
  landlord: z.number().int(),
});

export type ReviewRatings = z.infer<typeof reviewRatingsSchema>;

export type RatingKey = keyof ReviewRatings;

/**
 * The five things somebody is asked to score, in the order they are asked.
 *
 * Overall first because it is the one people arrive with an answer to; the other four
 * are the ones a listing page cannot tell you and a landlord will not. The prompts
 * name the actual Nigerian failure modes — a form that asks about "utilities" gets
 * three stars and no information.
 */
export const RATING_CRITERIA: readonly { key: RatingKey; label: string; hint: string }[] = [
  { key: "overall", label: "Overall", hint: "Living there, all things considered" },
  { key: "water", label: "Water", hint: "Did the taps actually run?" },
  { key: "power", label: "Power", hint: "How often it was off, and whether there was a generator" },
  { key: "security", label: "Security", hint: "The gate, the fence, walking in at night" },
  { key: "landlord", label: "Landlord", hint: "Repairs, and what happened to your deposit" },
];

/**
 * A review as a stranger reads it, deciding whether to rent the place.
 *
 * `author.name` is a first name and a last initial, and there is NO author id — both
 * on purpose, on the server. A review says where somebody lived and roughly when;
 * a full name beside that publishes their address history, and a stable id would let
 * anyone group every review by the same person and reconstruct the rest of it.
 * `residedFrom`/`residedTo` are `YYYY-MM` for the same reason: a reader needs to know
 * how recent the experience is, not the day of the month.
 *
 * `mine` is the server comparing the session to the author. It is how the page knows
 * not to offer somebody a "report" button on their own words, and it is the only
 * thing a session changes about this response.
 */
export const publicReviewSchema = z.object({
  id: z.string(),
  /** The residence claim behind it is CONFIRMED. Read off the response, never derived. */
  verified: z.boolean(),
  ratings: reviewRatingsSchema,
  body: z.string(),
  author: z.object({ name: z.string() }),
  /** `YYYY-MM`. Use `formatMonthYear`, not `formatDate`. */
  residedFrom: z.string(),
  /** Absent means they still live there. */
  residedTo: z.string().optional(),
  createdAt: z.string(),
  edited: z.boolean(),
  mine: z.boolean(),
});

export type PublicReview = z.infer<typeof publicReviewSchema>;

/**
 * The author's own copy: their full text back to edit, and its moderation state.
 *
 * `property` is the same shape as a residence claim's listing summary, and reuses the
 * same schema deliberately — a review and the claim it hangs off describe the same
 * flat, and two definitions of "just enough of the property" would drift.
 *
 * Dates are full `YYYY-MM-DD` here. It is their own tenancy; nothing is being
 * protected from them.
 */
export const myReviewSchema = z.object({
  id: z.string(),
  /** Which tenancy this is a review of. One review per claim, enforced in the database. */
  residenceId: z.string(),
  status: reviewStatusSchema,
  verified: z.boolean(),
  ratings: reviewRatingsSchema,
  body: z.string(),
  residedFrom: z.string(),
  residedTo: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  property: residenceListingSchema,
});

export type MyReview = z.infer<typeof myReviewSchema>;

/**
 * A complaint about a review, as the admin deciding on it sees it.
 *
 * The only shape in this domain that carries account ids and full names, because
 * acting on an account needs to know whose. `resolvedAt` present means somebody has
 * already decided — the queue is auditable after the fact, not emptied.
 */
export const reportedReviewSchema = z.object({
  reportId: z.string(),
  reason: z.string(),
  reportedAt: z.string(),
  resolvedAt: z.string().optional(),
  reporter: z.object({ id: z.string(), name: z.string() }),
  review: z.object({
    id: z.string(),
    status: reviewStatusSchema,
    verified: z.boolean(),
    ratings: reviewRatingsSchema,
    body: z.string(),
    createdAt: z.string(),
    author: z.object({ id: z.string(), name: z.string() }),
    property: residenceListingSchema,
  }),
});

export type ReportedReview = z.infer<typeof reportedReviewSchema>;

export const publicReviewListResponseSchema = z.object({
  reviews: z.array(publicReviewSchema),
  total: z.number().int(),
  page: z.number().int(),
  pageSize: z.number().int(),
  totalPages: z.number().int(),
});

export type PublicReviewListResponse = z.infer<typeof publicReviewListResponseSchema>;

export const myReviewListResponseSchema = publicReviewListResponseSchema.extend({
  reviews: z.array(myReviewSchema),
});

export type MyReviewListResponse = z.infer<typeof myReviewListResponseSchema>;

export const reportedReviewListResponseSchema = publicReviewListResponseSchema.extend({
  reviews: z.array(reportedReviewSchema),
});

export type ReportedReviewListResponse = z.infer<typeof reportedReviewListResponseSchema>;

/**
 * The aggregate above a listing's reviews.
 *
 * `verified.averages` is NULL when the count is zero, and that nullability is the
 * most important thing in this section. A zero would render as one star out of five —
 * a rating invented about somebody's home because nobody had reviewed it yet. Every
 * consumer has to handle the null; none of them may substitute a number for it.
 *
 * Three separate figures rather than one, because they answer different questions:
 * the average is over confirmed tenancies only, `unverifiedCount` is how many voices
 * exist that the average deliberately excludes, and `residents` is how many people
 * the owner has confirmed lived there at all — reviewed or not.
 */
export const experienceAveragesSchema = z.object({
  overall: z.number(),
  water: z.number(),
  power: z.number(),
  security: z.number(),
  landlord: z.number(),
});

export type ExperienceAverages = z.infer<typeof experienceAveragesSchema>;

export const experienceSummarySchema = z.object({
  propertyId: z.string(),
  verified: z.object({
    count: z.number().int(),
    /** Null at zero reviews. Not a number. */
    averages: experienceAveragesSchema.nullable(),
  }),
  unverifiedCount: z.number().int(),
  residents: z.number().int(),
});

export type ExperienceSummary = z.infer<typeof experienceSummarySchema>;

/**
 * The public list's query.
 *
 * `verifiedOnly` defaults to false, matching the server: showing only confirmed
 * reviews is a reader's choice to make, never the platform's default, because the
 * confirming is done by the person being reviewed.
 */
export const reviewListParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  verifiedOnly: z.boolean().default(false),
});

export type ReviewListParams = z.infer<typeof reviewListParamsSchema>;

/** The admin report queue's query. `resolved: true` is the audit view. */
export const reportListParamsSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(20),
  resolved: z.boolean().default(false),
});

export type ReportListParams = z.infer<typeof reportListParamsSchema>;

/**
 * One score, 1–5.
 *
 * Plain `z.number()` rather than the server's `z.coerce.number()`: the star control
 * hands over a real number and JSON carries it as one, so there is nothing to coerce.
 * The server coerces because a form-encoded client would send `"4"`.
 *
 * `required_error` matters more than it looks — an unpicked rating is `undefined`, and
 * without it the form would say "Required" instead of naming what to rate.
 */
function rating(what: string) {
  const message = `Rate ${what} from 1 to 5`;
  return z
    .number({ required_error: message, invalid_type_error: message })
    .int(message)
    .min(1, message)
    .max(5, message);
}

/**
 * How much someone has to write: the server's floor, restated.
 *
 * Five stars and the word "good" is a score, and the five ratings already carry the
 * score. Thirty characters is about one clause — enough that "Water is fine, power is
 * not" passes and a blank-eyed five stars does not.
 */
const REVIEW_BODY_MIN = 30;
const REVIEW_BODY_MAX = 2000;

const reviewBody = z
  .string()
  .trim()
  .min(REVIEW_BODY_MIN, "Tell people what living there was actually like — a sentence or two")
  .max(REVIEW_BODY_MAX, `Keep it under ${REVIEW_BODY_MAX} characters`);

const reviewRatingFields = {
  overall: rating("your overall experience"),
  water: rating("the water supply"),
  power: rating("the power supply"),
  security: rating("security"),
  landlord: rating("the landlord"),
};

/**
 * Writing a review.
 *
 * `residenceId` and not `propertyId`: the property comes from the claim on the server,
 * so no request gets to say which listing a review is filed against. Living somewhere
 * twice years apart is two tenancies and two reviewable periods, which is why the
 * caller has to name one rather than the server guessing.
 *
 * No `status` and no `verified`. The status is the column's default and `verified` is
 * recomputed from the claim on every read.
 */
export const createReviewSchema = z.object({
  residenceId: z.string().min(1, "Choose which tenancy this review is of"),
  ...reviewRatingFields,
  body: reviewBody,
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/**
 * The author revising their own review.
 *
 * Partial, so fixing a typo does not mean re-sending five ratings. No `residenceId`:
 * a review is of one tenancy for its whole life, and moving it would silently change
 * which property it counts towards.
 */
export const updateReviewSchema = z
  .object({ ...reviewRatingFields, body: reviewBody })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "Nothing to update" });

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/**
 * Reporting a review.
 *
 * A floor on the reason, because a human reads it and decides: "inappropriate" is a
 * feeling, not a report. Reporting cannot hide a review and there is no field here
 * that could — a landlord able to bury a bad review by reporting it would make every
 * good rating on the platform worthless.
 */
export const reportReviewSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(15, "Say what is wrong with it — an admin reads this and decides")
    .max(1000, "Keep this under 1000 characters"),
});

export type ReportReviewInput = z.infer<typeof reportReviewSchema>;

/** All the reporter is told: the complaint landed. Never the review's fate. */
export const reportAcceptedSchema = z.object({ reported: z.literal(true) });

/**
 * An admin's decision on a reported review.
 *
 * The status is the whole decision, including "leave it up" — setting PUBLISHED on an
 * already-published review is how a report is dismissed, which is why there is no
 * separate dismiss call to drift out of step with this one.
 *
 * No body and no ratings: a moderator may take a review down and may not rewrite what
 * somebody said. `note` is for the admin record and is logged rather than stored, so
 * neither the author nor the public ever reads it.
 */
export const moderateReviewSchema = z.object({
  status: reviewStatusSchema,
  note: z
    .string()
    .trim()
    .max(1000, "Keep this under 1000 characters")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export type ModerateReviewInput = z.input<typeof moderateReviewSchema>;

/** What moderating answers: the new status, and how many complaints it closed. */
export const moderationResultSchema = z.object({
  id: z.string(),
  status: reviewStatusSchema,
  reportsResolved: z.number().int(),
});

export type ModerationResult = z.infer<typeof moderationResultSchema>;

/* ------------------------------------------------------------- Media -- */

/**
 * `POST /media/upload-signature` — permission to upload one photo.
 *
 * The browser sends the file DIRECTLY to Cloudinary; it never travels through
 * our API. So this is all the server hands over: where to post, and a bag of
 * form fields to send with the file.
 *
 * `fields` is opaque on purpose and typed as a plain record. Every field in it
 * was signed by the server, and a signature only verifies if the exact same set
 * of fields is posted — so the client's job is to copy them across untouched, not
 * to know what any of them mean. Naming them here would invite editing them.
 *
 * The API secret is never part of this response. That is the entire reason the
 * endpoint exists (see `backend/src/lib/cloudinary.ts`).
 */
export const uploadTicketSchema = z.object({
  uploadUrl: z.string().url(),
  fields: z.record(z.string()),
  publicId: z.string().min(1),
  expiresAt: z.string(),
});

export type UploadTicket = z.infer<typeof uploadTicketSchema>;

/**
 * What Cloudinary answers with. Only the two fields we use are described —
 * the real response has around thirty, and asserting on the rest would break
 * the upload flow the day the provider adds a field.
 */
export const cloudinaryUploadResultSchema = z.object({
  secure_url: z.string().url(),
  public_id: z.string(),
});

/* ----------------------------------------------------------- Contact -- */

export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z
    .string()
    .regex(/^(\+234|0)[789]\d{9}$/, "Invalid Nigerian phone number")
    .optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters"),
  message: z.string().min(20, "Message must be at least 20 characters"),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

/* ------------------------------------------------------------ Auth -- */

/**
 * Password policy, mirroring `backend/src/modules/auth/auth.schemas.ts`.
 * Duplicated deliberately: the client copy gives instant feedback, the server
 * copy is the one that actually protects anything.
 */
const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  // Don't restate the policy on login — the account may predate it. Just
  // require something, and let the server decide.
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(2, "First name must be at least 2 characters"),
    lastName: z.string().trim().min(2, "Last name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    phone: phoneField,
    password: passwordPolicy,
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role: signupRoleSchema,
    // Only meaningful for students; the column is nullable and a landlord or
    // mover has no university.
    university: z.string().optional(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "Please accept the terms to continue" }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is missing"),
    password: passwordPolicy,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const resendVerificationSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;
export type ResendVerificationData = z.infer<typeof resendVerificationSchema>;

/**
 * Auth is cookie-based: register/login set an httpOnly `wale_session` cookie
 * and return only the user. There is deliberately no body token — one would
 * imply JS-readable storage and defeat the httpOnly cookie.
 */
export const authResponseSchema = z.object({
  user: userSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/**
 * Endpoints that deliberately say the same thing whether or not the account
 * exists, so they cannot be used to enumerate users. Render the message as-is.
 */
export const messageResponseSchema = z.object({
  message: z.string(),
});

export type MessageResponse = z.infer<typeof messageResponseSchema>;

/** POST /auth/verify-email returns the freshly-verified user plus a message. */
export const verifyEmailResponseSchema = z.object({
  user: userSchema,
  message: z.string(),
});

export type VerifyEmailResponse = z.infer<typeof verifyEmailResponseSchema>;

/** GET /users/me/roles */
export const myRolesResponseSchema = z.object({
  primaryRole: roleSchema,
  roles: z.array(roleSchema),
  claimable: z.array(roleSchema).optional(),
});

export type MyRolesResponse = z.infer<typeof myRolesResponseSchema>;

/* ----------------------------------------------------------- API Error -- */

/**
 * Flat error shape produced by the API client's error interceptor, which
 * normalizes the backend's nested `{ error: { code, message, details } }`.
 */
export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  field: z.string().optional(),
  details: z
    .array(z.object({ field: z.string().optional(), message: z.string() }))
    .optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
