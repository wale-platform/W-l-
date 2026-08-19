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

/* ---------------------------------------------------------------- User -- */

/**
 * Roles as the backend emits them (Prisma `Role` enum). The UI maps these to
 * human labels — it must not invent its own vocabulary, or every real user
 * fails to parse.
 */
export const roleSchema = z.enum(["USER", "LANDLORD", "ADMIN"]);

export type Role = z.infer<typeof roleSchema>;

/** Display labels for roles, kept next to the enum so they cannot drift. */
export const roleLabels: Record<Role, string> = {
  USER: "Tenant",
  LANDLORD: "Landlord",
  ADMIN: "Administrator",
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
  role: roleSchema,
  university: z.string().nullable().optional(),
  avatar: z.string().url().nullable().optional(),
  emailVerified: z.boolean().optional(),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

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

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  university: z.string().min(1, "Please select your university"),
});

export type LoginData = z.infer<typeof loginSchema>;
export type RegisterData = z.infer<typeof registerSchema>;

/**
 * Auth is cookie-based: register/login set an httpOnly `wale_session` cookie
 * and return only the user. There is deliberately no body token — one would
 * imply JS-readable storage and defeat the httpOnly cookie.
 */
export const authResponseSchema = z.object({
  user: userSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

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
