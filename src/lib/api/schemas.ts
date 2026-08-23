import { z } from "zod";

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

export const propertySchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  price: z.number(),
  type: z.enum(["studio", "one_bedroom", "two_bedroom", "shared"]),
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
 */
export const ownerPropertySchema = propertySchema.extend({
  status: propertyStatusSchema,
  neighborhood: z.string().optional(),
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
 * `images` is absent too — photos are uploaded separately (Cloudinary signed
 * uploads), and the backend deliberately allows a photoless DRAFT while
 * refusing to put one into the review queue.
 */

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
  type: z.enum(["studio", "one_bedroom", "two_bedroom", "shared"], {
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
  university: optionalField(z.string().min(1).max(120)),
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
    contactName: property.landlord.name,
    contactPhone: property.landlord.phone,
    contactEmail: property.landlord.email ?? "",
  };
}

/* ---------------------------------------------------------- Search/Filter -- */

export const searchParamsSchema = z.object({
  query: z.string().optional(),
  university: z.string().optional(),
  minPrice: z.number().optional(),
  maxPrice: z.number().optional(),
  type: z.enum(["studio", "one_bedroom", "two_bedroom", "shared"]).optional(),
  verifiedOnly: z.boolean().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(12),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

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
