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

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().optional(),
    email: emailField,
    password: passwordPolicy,
    university: z.string().min(1, "Please select your university"),
  })
  .refine((d) => Boolean(d.name ?? d.firstName), {
    message: "Provide either name or firstName",
    path: ["name"],
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
