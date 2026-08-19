import { z } from "zod";

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

export const listPropertiesQuerySchema = z.object({
  query: optionalText,
  university: optionalText,
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  type: z.enum(["studio", "one_bedroom", "two_bedroom", "shared"]).optional(),
  verifiedOnly: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export type ListPropertiesQuery = z.infer<typeof listPropertiesQuerySchema>;

export const propertyIdParamSchema = z.object({
  id: z.string().min(1),
});
