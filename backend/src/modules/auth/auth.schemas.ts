import { z } from "zod";

/**
 * Auth request schemas.
 *
 * The password policy mirrors the frontend's `registerSchema` (min 8, with
 * upper + lower + digit) so client and server agree. Registration accepts
 * EITHER the frontend's single `name` OR explicit `firstName`/`lastName`
 * (conflict #3) and normalizes to the stored split via `splitName`.
 */

const passwordPolicy = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

const emailField = z.string().email("Invalid email address").toLowerCase().trim();

/**
 * Nigerian mobile number, accepted in the formats people actually type:
 * 08012345678, 8012345678, +2348012345678, 0801 234 5678.
 * Normalized to +234XXXXXXXXXX so stored numbers are directly comparable and
 * usable by SMS/WhatsApp providers later.
 */
const phoneField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ""))
  .refine((v) => /^(\+?234|0)?[789][01]\d{8}$/.test(v), {
    message: "Enter a valid Nigerian phone number, e.g. 08012345678",
  })
  .transform((v) => {
    const digits = v.replace(/^\+?234/, "").replace(/^0/, "");
    return `+234${digits}`;
  });

/**
 * Roles a person may pick when signing up. Deliberately EXCLUDES LAWYER and
 * ADMIN: those confer trust or power and must be granted by an administrator,
 * so they are not offered here and are rejected by the enum if sent anyway.
 * See src/modules/users/role.service.ts.
 */
export const signupRoleSchema = z.enum(["TENANT", "LANDLORD", "MOVER"]);

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    firstName: z.string().trim().min(2, "First name must be at least 2 characters").optional(),
    lastName: z.string().trim().min(2, "Last name must be at least 2 characters").optional(),
    email: emailField,
    phone: phoneField.optional(),
    password: passwordPolicy,
    // Optional so existing/API clients that don't send it still work; the UI
    // always sends it and the mismatch is reported against this field.
    confirmPassword: z.string().optional(),
    role: signupRoleSchema.optional(),
    // Optional, matching the nullable column. Wale started student-focused, but
    // a landlord or mover has no university, and requiring it here would make
    // those roles unregisterable. The tenant UI still collects it.
    university: z.string().min(1, "Please select your university").optional(),
  })
  .refine((d) => Boolean(d.name ?? d.firstName), {
    message: "Provide either name or firstName",
    path: ["name"],
  })
  .refine((d) => d.confirmPassword === undefined || d.confirmPassword === d.password, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: emailField,
  // Don't leak the policy on login; just require a non-empty value, then verify.
  password: z.string().min(1, "Password is required"),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, "Verification token is required"),
});

export const resendVerificationSchema = z.object({
  email: emailField,
});

export const forgotPasswordSchema = z.object({
  email: emailField,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: passwordPolicy,
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

/** Normalize the register name inputs into the stored first/last split. */
export function splitName(input: {
  name?: string;
  firstName?: string;
  lastName?: string;
}): { firstName: string; lastName: string } {
  if (input.firstName) {
    return { firstName: input.firstName.trim(), lastName: (input.lastName ?? "").trim() };
  }
  const parts = (input.name ?? "").trim().split(/\s+/).filter(Boolean);
  const firstName = parts.shift() ?? "";
  return { firstName, lastName: parts.join(" ") };
}
