import { InspectionStatus } from "@prisma/client";
import { z } from "zod";

/**
 * Request schemas for the inspection domain.
 *
 * Two writes, and they belong to different people: a tenant asks (`requestSchema`),
 * and the listing's owner answers (`respondSchema`). Keeping them apart is not
 * decoration — the tenant may not set a status and the landlord may not rewrite
 * the appointment, and a single shared body schema would make both of those a
 * matter of remembering to strip fields in the service.
 */

/**
 * When the tenant would like to come.
 *
 * A full ISO datetime, because "Saturday" is not something a landlord can be at
 * the property for. Bounded at both ends:
 *
 *  - It must be in the future. A request to view a flat last Tuesday is either a
 *    mistake or a clock problem, and either way the landlord can do nothing with
 *    it. The floor is a few minutes back rather than exactly now, so a tenant on
 *    a slow connection is not rejected for taking eleven seconds to tap "send".
 *  - No more than 90 days out. Not a policy so much as a sanity bound: a request
 *    for 2049 is a typo, and letting it through would sit in the landlord's queue
 *    forever looking like real work.
 */
const HORIZON_DAYS = 90;
const CLOCK_SLACK_MS = 5 * 60 * 1000;

export const preferredAt = z
  .string()
  .trim()
  .datetime({ offset: true, message: "Pick a date and time for the viewing" })
  .transform((v) => new Date(v))
  .refine((d) => d.getTime() > Date.now() - CLOCK_SLACK_MS, {
    message: "Pick a time in the future",
  })
  .refine((d) => d.getTime() < Date.now() + HORIZON_DAYS * 86_400_000, {
    message: `Pick a time within the next ${HORIZON_DAYS} days`,
  });

/**
 * A tenant's request to view a listing.
 *
 * `status` is absent on purpose, as is anything identifying the tenant: the
 * status starts at REQUESTED because only the landlord can move it, and the
 * tenant is the session, never a field in the body. A client that sends either
 * is ignored rather than trusted.
 */
export const createInspectionSchema = z.object({
  preferredAt,
  // Short by design. This is "I can only do mornings", not a message thread —
  // that is the chat domain, and a note long enough to hold a conversation would
  // quietly become one, with no history and no way to reply.
  note: z.string().trim().min(1).max(500).optional(),
});

export type CreateInspectionInput = z.infer<typeof createInspectionSchema>;

/**
 * The landlord's answer.
 *
 * Only three statuses are reachable here, and DECLINED requires a response.
 * "Declined" on its own leaves the tenant unable to tell whether to propose
 * another time or give up on the place entirely — and they are shown these words
 * verbatim, so the floor exists to stop "no" being a complete answer. It is a
 * weak check and meant to be: what actually helps is that the tenant reads it.
 *
 * CONFIRMED and COMPLETED take an optional one ("come to the gate, ask for
 * Musa"), which is genuinely useful and genuinely optional.
 *
 * REQUESTED is not offered: a landlord un-answering a request they have already
 * answered would leave the tenant with a confirmation they can no longer rely
 * on. CANCELLED is not offered either — that belongs to the tenant, who is the
 * one who cannot make it.
 */
export const respondToInspectionSchema = z
  .object({
    status: z.enum([
      InspectionStatus.CONFIRMED,
      InspectionStatus.DECLINED,
      InspectionStatus.COMPLETED,
    ]),
    response: z.string().trim().min(1).max(1000).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.status === InspectionStatus.DECLINED && (body.response ?? "").length < 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["response"],
        message: "Say why, or suggest another time — the tenant sees this word for word",
      });
    }
  });

export type RespondToInspectionInput = z.infer<typeof respondToInspectionSchema>;

export const inspectionIdParamSchema = z.object({
  id: z.string().min(1),
});

/**
 * Query for the inspection lists.
 *
 * One schema for both the tenant's own requests and the landlord's incoming
 * queue, because the only thing that differs between them is who is asking —
 * which is the session, not a parameter. `status` is optional so either side can
 * narrow to what is still outstanding.
 */
export const listInspectionsQuerySchema = z.object({
  status: z.nativeEnum(InspectionStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type ListInspectionsQuery = z.infer<typeof listInspectionsQuerySchema>;
