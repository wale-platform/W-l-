import { ResidenceStatus } from "@prisma/client";
import { z } from "zod";

import { dateOnly } from "../../lib/zod-fields";

/**
 * Request schemas for the residence domain.
 *
 * Three writes belonging to two different people: the claimant makes a claim and
 * may withdraw it, and the property's owner decides on it. Kept in separate
 * schemas for the same reason the inspection ones are — the claimant may not set
 * a status and the owner may not rewrite the dates, and one shared body schema
 * would make both of those a matter of remembering to strip fields in the
 * service.
 */

/**
 * How far back a claim may reach.
 *
 * A sanity bound, not a policy: "I lived here in 1974" is a typo or a joke, and
 * the platform did not exist for any of the period it would cover. Thirty years
 * is generous enough that a genuine long-ago tenancy is not refused.
 */
const EARLIEST_YEARS = 30;

/** Midnight UTC today, matching how `dateOnly` parses. */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * A claim to have lived at a property.
 *
 * `propertyId` is in the body rather than the path because the claim is the thing
 * being created and the property is one of its fields — unlike a viewing request,
 * where the listing's own status decides whether the request is possible at all.
 *
 * Neither `status` nor anything identifying the claimant appears here. The status
 * starts UNVERIFIED because only the property's owner can move it, and the
 * claimant is the session. A client that sends either is ignored, not trusted.
 *
 * The dates are calendar dates. Nobody remembers the hour they moved in, and a
 * timestamp would invite a timezone bug in exchange for precision that does not
 * exist in the underlying fact.
 */
export const createResidenceSchema = z
  .object({
    propertyId: z.string().min(1, "Choose a property"),
    movedInAt: dateOnly,
    // Absent means "still living here" — which is a real answer, and one that
    // still entitles someone to review the place. Six months into a tenancy you
    // know about the water supply.
    movedOutAt: dateOnly.optional(),
    // The claimant's own words, for the owner reading the claim: "flat 3
    // upstairs, you may remember my brother helped me move in". This is what
    // makes a claim recognisable to somebody who let the place three years ago.
    note: z.string().trim().min(1).max(500).optional(),
  })
  .superRefine((body, ctx) => {
    const today = todayUtc();

    if (body.movedInAt > today) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["movedInAt"],
        message: "This is your residence history — pick a date you have already moved in on",
      });
    }

    const earliest = new Date(today);
    earliest.setUTCFullYear(earliest.getUTCFullYear() - EARLIEST_YEARS);
    if (body.movedInAt < earliest) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["movedInAt"],
        message: `Pick a date within the last ${EARLIEST_YEARS} years`,
      });
    }

    if (body.movedOutAt) {
      if (body.movedOutAt < body.movedInAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["movedOutAt"],
          message: "You cannot have moved out before you moved in",
        });
      }
      // A tenancy that has not ended yet is `movedOutAt: null`, which is what
      // "still living here" means. Allowing a future date would create a second
      // spelling of the same thing, and the two would drift apart.
      if (body.movedOutAt > today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["movedOutAt"],
          message: "Leave this empty if you still live here",
        });
      }
    }
  });

export type CreateResidenceInput = z.infer<typeof createResidenceSchema>;

/**
 * The owner's refusal, in their own words.
 *
 * Required, and with a floor. The claimant is shown this verbatim, and "Rejected"
 * on its own does not tell them whether they picked the wrong listing off a
 * search page or are being accused of making it up. It is a weak check and meant
 * to be — what actually helps is that the claimant reads it.
 *
 * Confirming needs no body at all, which is why there is no shared schema here:
 * the asymmetry is the rule, so it is expressed as two schemas rather than as a
 * `superRefine` that has to remember which status needs which field.
 */
export const rejectResidenceSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(10, "Say why — the person who made this claim sees this word for word")
    .max(1000),
});

export type RejectResidenceInput = z.infer<typeof rejectResidenceSchema>;

export const residenceIdParamSchema = z.object({
  id: z.string().min(1),
});

/**
 * Query for the residence lists.
 *
 * One schema for the claimant's own claims and the owner's incoming queue,
 * because the only thing that differs between them is who is asking — which is
 * the session, not a parameter.
 */
export const listResidencesQuerySchema = z.object({
  status: z.nativeEnum(ResidenceStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListResidencesQuery = z.infer<typeof listResidencesQuerySchema>;
