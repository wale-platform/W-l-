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

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["student", "admin"]),
  university: z.string().optional(),
  avatar: z.string().url().nullable().optional(),
  createdAt: z.string().datetime(),
});

export type User = z.infer<typeof userSchema>;

/* ------------------------------------------------------------ Property -- */

/** Apartment types, in the order they are offered in forms and filters. */
export const PROPERTY_TYPES = [
  { value: "flat", label: "Flat" },
  { value: "self_contained", label: "Self-contained" },
  { value: "room", label: "Room" },
  { value: "studio", label: "Studio" },
  { value: "shared", label: "Shared" },
] as const;

export const propertyTypeSchema = z.enum(["flat", "self_contained", "room", "studio", "shared"]);
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
  source: z.enum(["wale", "agent", "landlord", "lawyer", "tenant"]),
  availabilityStatus: z.enum(["available", "limited", "occupied"]).optional(),
  featured: z.boolean().optional(),
  /** Paid boost: ranks first in search until this time. */
  boostedUntil: z.string().nullable().optional(),
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
  type: propertyTypeSchema.optional(),
  verifiedOnly: z.boolean().optional(),
  source: z.string().optional(),
  availability: z.string().optional(),
  sortBy: z.string().optional(),
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(12),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/* ----------------------------------------------------------- Contact -- */

export const CONTACT_TOPICS = [
  { value: "general", label: "General question" },
  { value: "listing", label: "Question about a listing" },
  { value: "report", label: "Report a listing or landlord" },
  { value: "landlord", label: "Listing my property" },
  { value: "account", label: "Help with my account" },
  { value: "partnership", label: "Partnership or press" },
] as const;

const contactTopicValues = CONTACT_TOPICS.map((topic) => topic.value) as [
  (typeof CONTACT_TOPICS)[number]["value"],
  ...(typeof CONTACT_TOPICS)[number]["value"][],
];

export const contactFormSchema = z.object({
  topic: z.enum(contactTopicValues).default("general"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
  email: z.string().trim().email("Invalid email address").max(254),
  // Optional: a blank field arrives as "", which must not fail the format check.
  phone: z
    .union([
      z.literal(""),
      z.string().trim().regex(/^(\+234|0)[789]\d{9}$/, "Invalid Nigerian phone number"),
    ])
    .optional()
    .transform((phone) => phone || undefined),
  subject: z.string().trim().min(5, "Subject must be at least 5 characters").max(150),
  message: z
    .string()
    .trim()
    .min(20, "Message must be at least 20 characters")
    .max(4000, "Message must be 4,000 characters or fewer"),
});

export type ContactFormValues = z.input<typeof contactFormSchema>;
export type ContactTopic = (typeof CONTACT_TOPICS)[number]["value"];

export function isContactTopic(value: unknown): value is ContactTopic {
  return CONTACT_TOPICS.some((topic) => topic.value === value);
}
export type ContactFormData = z.output<typeof contactFormSchema>;

/* ------------------------------------------------------------ Auth -- */

/** Strength rules for any password a user chooses (sign-up, reset, change). */
export const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .max(200, "Password must be 200 characters or fewer");

const passwordsMatch = {
  check: (data: { password: string; confirmPassword: string }) =>
    data.password === data.confirmPassword,
  issue: { message: "Passwords do not match", path: ["confirmPassword"] },
};

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  remember: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(254),
});
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(20).max(200),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine(passwordsMatch.check, passwordsMatch.issue);
export type ResetPasswordData = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    // Optional because accounts created with Google have no password yet.
    currentPassword: z.string().max(200).optional(),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine(passwordsMatch.check, passwordsMatch.issue);
export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

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

export const signUpFormSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(120),
    email: z.string().trim().email("Invalid email address").max(254),
    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .regex(/^(\+234|0)[789]\d{9}$/, "Invalid Nigerian phone number"),
    role: z.enum(["student", "landlord", "lawyer", "tenant"]).default("student"),
    password: newPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm password is required"),
  })
  .refine(passwordsMatch.check, passwordsMatch.issue);

export type SignUpFormData = z.infer<typeof signUpFormSchema>;

export const authRoleSchema = z.enum(["student", "landlord", "lawyer", "tenant", "admin"]);
export type AuthRole = z.infer<typeof authRoleSchema>;

/** Roles that may sign themselves up. Admins are promoted in the database. */
export const signUpRoleSchema = z.enum(["student", "landlord", "lawyer", "tenant"]);
export type SignUpRole = z.infer<typeof signUpRoleSchema>;

/** Roles allowed to submit listings, and the listing `source` they produce. */
export const LISTING_ROLES = ["landlord", "lawyer", "tenant"] as const;

/** The signed-in user as returned by `/api/auth/*`. Never carries secrets. */
export const authUserSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  role: authRoleSchema,
  university: z.string().optional(),
  emailVerified: z.boolean(),
  /** False for Google-only accounts that haven't set a password yet. */
  hasPassword: z.boolean(),
  createdAt: z.string(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

/* -------------------------------------------------------- Listing input -- */

/**
 * What a landlord / lawyer / tenant submits for a new listing. Images are
 * sent alongside as multipart files and validated separately on the server.
 */
export const propertyInputSchema = z.object({
  title: z.string().trim().min(5, "Title must be at least 5 characters").max(120),
  description: z
    .string()
    .trim()
    .min(20, "Description must be at least 20 characters")
    .max(4000, "Description must be 4,000 characters or fewer"),
  price: z.coerce
    .number({ invalid_type_error: "Enter the yearly rent" })
    .int("Rent must be a whole number")
    .positive("Rent must be more than zero")
    .max(100_000_000, "Rent looks too high"),
  type: z.enum(["flat", "self_contained", "room", "studio", "shared"], {
    errorMap: () => ({ message: "Select an apartment type" }),
  }),
  bedrooms: z.coerce.number().int().min(0).max(20),
  bathrooms: z.coerce.number().int().min(1, "At least one bathroom").max(20),
  address: z.string().trim().min(5, "Enter the full address").max(200),
  city: z.string().trim().min(2, "Enter the city").max(80),
  state: z.string().trim().min(2, "Enter the state").max(80),
  university: z.string().trim().max(120).optional(),
  availableDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Select the date the property is available"),
  amenities: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  contactName: z.string().trim().min(2).max(120).optional(),
  contactPhone: z
    .string()
    .trim()
    .regex(/^(\+234|0)[789]\d{9}$/, "Invalid Nigerian phone number")
    .optional(),
});

export type PropertyInput = z.infer<typeof propertyInputSchema>;
export type PropertyInputValues = z.input<typeof propertyInputSchema>;

/** Upload limits shared by the form and the route handler. */
export const PROPERTY_IMAGE_LIMITS = {
  maxCount: 8,
  maxBytes: 5 * 1024 * 1024,
  types: ["image/jpeg", "image/png", "image/webp"],
} as const;


export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string(),
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

/* -------------------------------------------------------- Wallet -- */

export const PAYMENT_PROVIDERS = [
  { value: "paystack", label: "Paystack" },
  { value: "flutterwave", label: "Flutterwave" },
] as const;

export const paymentProviderSchema = z.enum(["paystack", "flutterwave"]);
export type PaymentProvider = z.infer<typeof paymentProviderSchema>;

/** Wallet top-up limits, in naira. */
export const WALLET_TOP_UP_LIMITS = { min: 100, max: 5_000_000 } as const;

export const walletTopUpSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Enter an amount" })
    .int("Enter a whole naira amount")
    .min(WALLET_TOP_UP_LIMITS.min, `The minimum top-up is ₦${WALLET_TOP_UP_LIMITS.min.toLocaleString("en-NG")}`)
    .max(WALLET_TOP_UP_LIMITS.max, `The maximum top-up is ₦${WALLET_TOP_UP_LIMITS.max.toLocaleString("en-NG")}`),
  provider: paymentProviderSchema,
});
export type WalletTopUpValues = z.input<typeof walletTopUpSchema>;
export type WalletTopUp = z.output<typeof walletTopUpSchema>;

export const walletPaymentSchema = z.object({
  reference: z.string(),
  provider: paymentProviderSchema,
  amountKobo: z.number().int(),
  status: z.enum(["pending", "success", "failed"]),
  createdAt: z.string(),
  paidAt: z.string().nullable(),
});

export const walletSchema = z.object({
  balanceKobo: z.number().int(),
  payments: z.array(walletPaymentSchema),
  providers: z.object({ paystack: z.boolean(), flutterwave: z.boolean() }),
});
export type Wallet = z.infer<typeof walletSchema>;
export type WalletPayment = z.infer<typeof walletPaymentSchema>;

/* ---------------------------------------------------------- Boosts -- */

/**
 * Paid listing boosts. Prices are in naira; edit here to change them —
 * the server charges from this table, never from the browser.
 */
export const BOOST_PLANS = [
  { id: "7d", label: "1 week", days: 7, price: 2_000 },
  { id: "14d", label: "2 weeks", days: 14, price: 3_500 },
  { id: "30d", label: "1 month", days: 30, price: 6_000 },
] as const;
export type BoostPlanId = (typeof BOOST_PLANS)[number]["id"];

export const PAY_METHODS = [
  { value: "wallet", label: "Wallet balance" },
  { value: "paystack", label: "Paystack" },
  { value: "flutterwave", label: "Flutterwave" },
] as const;
export const payMethodSchema = z.enum(["wallet", "paystack", "flutterwave"]);
export type PayMethod = z.infer<typeof payMethodSchema>;

export const boostRequestSchema = z.object({
  propertyId: z.string().min(1).max(80),
  plan: z.enum(["7d", "14d", "30d"], { errorMap: () => ({ message: "Choose a boost plan" }) }),
  method: payMethodSchema,
});
export type BoostRequest = z.infer<typeof boostRequestSchema>;

/* --------------------------------------------------------- Payouts -- */

export const PAYOUT_MIN_NAIRA = 1_000;

export const payoutRequestSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Enter an amount" })
    .int("Enter a whole naira amount")
    .min(PAYOUT_MIN_NAIRA, `The minimum withdrawal is ₦${PAYOUT_MIN_NAIRA.toLocaleString("en-NG")}`)
    .max(10_000_000, "That amount is too large for one withdrawal"),
  bankCode: z.string().trim().min(1, "Choose your bank").max(20),
  accountNumber: z.string().trim().regex(/^\d{10}$/, "Account numbers are 10 digits"),
});
export type PayoutRequestValues = z.input<typeof payoutRequestSchema>;
export type PayoutRequest = z.output<typeof payoutRequestSchema>;

export const payoutSchema = z.object({
  id: z.string(),
  amountKobo: z.number().int(),
  bankName: z.string(),
  accountNumber: z.string(),
  accountName: z.string(),
  status: z.enum(["pending", "paid", "rejected"]),
  transferReference: z.string().nullable(),
  adminNote: z.string().nullable(),
  createdAt: z.string(),
  processedAt: z.string().nullable(),
  user: z.object({ id: z.string(), name: z.string(), email: z.string() }).optional(),
});
export type Payout = z.infer<typeof payoutSchema>;

/* ----------------------------------------------------------- API Error -- */

export const apiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  field: z.string().optional(),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
