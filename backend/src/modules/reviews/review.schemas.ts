import { ReviewStatus } from "@prisma/client";
import { z } from "zod";

/**
 * Request schemas for lived-experience reviews.
 *
 * Four writes belonging to three different people: the person who lived there
 * writes and edits, anybody may report, and an admin moderates. Separate schemas,
 * because the fields each is allowed to touch barely overlap — an author may never
 * set `status`, and a moderator may never touch a rating or a word of the body.
 * One shared schema would make both of those a matter of remembering to strip
 * fields in the service.
 *
 * `propertyId` appears in none of them. It is copied from the residence being
 * reviewed, so there is no request in which a client gets to say which property a
 * review is about.
 */

/**
 * One of the five scores.
 *
 * Coerced because these arrive from radio inputs, where the DOM value is a string
 * whatever the form library does with it. The range is the same 1–5 the database
 * enforces as a CHECK constraint — two places deliberately, because a rating
 * outside the range is not a validation nicety but a number that would silently
 * skew every average on the property.
 *
 * There is no "no opinion" option and no zero. A resident of six months has an
 * opinion about the water; a form that lets them skip it produces a summary that
 * is mostly absent, and an average over a partly-answered questionnaire is not
 * comparable between listings.
 */
function rating(what: string) {
  return z.coerce
    .number({ invalid_type_error: `Rate ${what} from 1 to 5` })
    .int(`Rate ${what} from 1 to 5`)
    .min(1, `Rate ${what} from 1 to 5`)
    .max(5, `Rate ${what} from 1 to 5`);
}

/**
 * How much someone has to write.
 *
 * A floor, because the whole point of this feature is the sentence a student
 * writes about the water going off in Harmattan — five stars and the word "good"
 * is a score, and the ratings already carry the score. Thirty characters is about
 * one short clause: low enough that "Water is fine, power is not" passes, high
 * enough that a blank-eyed five stars does not.
 */
const MIN_BODY = 30;
const MAX_BODY = 2000;

const reviewBody = z
  .string()
  .trim()
  .min(MIN_BODY, "Tell people what living there was actually like — a sentence or two")
  .max(MAX_BODY, `Keep it under ${MAX_BODY} characters`);

const ratings = {
  overall: rating("your overall experience"),
  water: rating("the water supply"),
  power: rating("the power supply"),
  security: rating("security"),
  landlord: rating("the landlord"),
};

/**
 * Writing a review.
 *
 * `residenceId` rather than nothing at all, even though the property is already in
 * the path: living somewhere twice years apart is two tenancies and two reviewable
 * periods, and picking one for the caller would be guessing which one they meant.
 * The service checks the residence belongs both to the caller and to the property
 * in the path — a mismatch is a 404, not an explanation.
 *
 * No `status`, no `verified`, no `propertyId`, no author. The status is the
 * database default, whether the review counts as verified is read off the
 * residence at display time, and the author is the session.
 */
export const createReviewSchema = z.object({
  residenceId: z.string().min(1, "Choose which tenancy this review is of"),
  ...ratings,
  body: reviewBody,
});

export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/**
 * The author revising their own review.
 *
 * Partial, so fixing a typo does not mean re-sending five ratings. `residenceId`
 * is absent: a review is of one tenancy for its whole life, and moving it to
 * another would silently change which property it counts towards.
 */
export const updateReviewSchema = z
  .object({ ...ratings, body: reviewBody })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: "Nothing to update" });

export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

/**
 * Reporting a review.
 *
 * A reason is required and has a floor for the same reason a rejection does: a
 * human reads it and decides. "Inappropriate" is not a report, it is a feeling.
 *
 * Nothing here can hide the review. See review.service.ts — that is the whole
 * design of this endpoint, not an omission from this schema.
 */
export const reportReviewSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(15, "Say what is wrong with it — an admin reads this and decides")
    .max(1000),
});

export type ReportReviewInput = z.infer<typeof reportReviewSchema>;

/**
 * An admin's decision on a review.
 *
 * The status is the whole decision, including "leave it up" — re-publishing an
 * already-published review is how a report is dismissed, so there is no separate
 * dismiss endpoint that could drift out of step with this one.
 *
 * `note` is for the admin record, never shown to the author or the public. The
 * body and the ratings are absent by design: a moderator may take a review down,
 * and may not edit what somebody said.
 */
export const moderateReviewSchema = z.object({
  status: z.nativeEnum(ReviewStatus),
  note: z.string().trim().min(1).max(1000).optional(),
});

export type ModerateReviewInput = z.infer<typeof moderateReviewSchema>;

export const reviewIdParamSchema = z.object({ id: z.string().min(1) });

/** The public list under a property. Newest first, so no sort parameter. */
export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),
  /**
   * Only reviews from confirmed tenancies. Off by default: the unverified ones
   * are shown, clearly labelled, because hiding them would quietly delete the
   * experience of everyone whose landlord never got round to clicking confirm.
   */
  verifiedOnly: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional()
    .default("false"),
});

export type ListReviewsQuery = z.infer<typeof listReviewsQuerySchema>;

/** The admin report queue. Outstanding first, which is the only useful default. */
export const listReportsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
  /** `true` shows what has already been handled. Default: only what has not. */
  resolved: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true")
    .optional()
    .default("false"),
});

export type ListReportsQuery = z.infer<typeof listReportsQuerySchema>;
