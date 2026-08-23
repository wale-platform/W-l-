import { z } from "zod";

/**
 * Field builders shared by more than one module's request schemas.
 *
 * These encode rules that have to be identical everywhere they appear. A phone
 * number normalized one way at registration and another way on a listing would
 * store two spellings of the same number, so any later "contact this landlord"
 * or "is this the same person" lookup would silently miss. One definition, one
 * place to change it.
 */

/**
 * Nigerian mobile number, accepted in the formats people actually type:
 * 08012345678, 8012345678, +2348012345678, 0801 234 5678.
 * Normalized to +234XXXXXXXXXX so stored numbers are directly comparable and
 * usable by SMS/WhatsApp providers later.
 */
export const nigerianPhone = z
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
 * A `YYYY-MM-DD` calendar date, parsed to a UTC-midnight `Date` for Prisma's
 * `@db.Date` columns.
 *
 * The round-trip check is the point: `new Date("2026-02-31")` does not fail, it
 * rolls over to March 3rd. Re-serializing and comparing is what actually
 * rejects a date that does not exist.
 */
export const dateOnly = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD")
  .refine(
    (v) => {
      const parsed = new Date(`${v}T00:00:00.000Z`);
      return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === v;
    },
    { message: "That date does not exist" },
  )
  .transform((v) => new Date(`${v}T00:00:00.000Z`));
