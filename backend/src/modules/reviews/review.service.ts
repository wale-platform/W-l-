import {
  Prisma,
  ResidenceStatus,
  ReviewStatus,
  type Role,
} from "@prisma/client";

import { frontendBaseUrl } from "../../config/env";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { sendReviewPostedEmail } from "../../lib/email";
import { logger } from "../../lib/logger";
import { PUBLICLY_LISTABLE } from "../properties/property.service";
import {
  toExperienceSummary,
  toMyReview,
  toPublicReview,
  toReportedReview,
  type ExperienceSummary,
  type MyReview,
  type PublicReview,
  type ReportedReview,
} from "./review.serializer";
import type {
  CreateReviewInput,
  ListReportsQuery,
  ListReviewsQuery,
  ModerateReviewInput,
  UpdateReviewInput,
} from "./review.schemas";

/**
 * Lived-experience reviews: what it was actually like to live somewhere.
 *
 * The rules that make this worth reading rather than worth gaming:
 *
 *  1. YOU CANNOT REVIEW A PLACE YOU DID NOT CLAIM TO LIVE IN. A review hangs off a
 *     `ResidenceHistory` row belonging to the caller, and that row is what names
 *     the property — the path's property id is checked against it, never copied
 *     from the request.
 *  2. ONE REVIEW PER TENANCY, in the database as a unique index on `residenceId`.
 *     Not per person per property: someone who lived somewhere twice has two
 *     tenancies and two things to say.
 *  3. AN UNCONFIRMED CLAIM STILL GETS A VOICE, labelled. It is published, it is
 *     marked unverified everywhere it appears, and it is excluded from the verified
 *     average. Silencing it would delete the experience of everyone whose landlord
 *     never got round to clicking confirm — which, since the landlord is the person
 *     being reviewed, would hand them a mute button.
 *  4. A REJECTED CLAIM GETS NOTHING. The owner has said this person did not live
 *     there. Letting them review anyway would make rejection decorative.
 *  5. REPORTING DOES NOT HIDE. A report is a queue item for an admin, nothing more.
 *     A landlord who could bury a bad review by reporting it would make the whole
 *     system worthless — so the report write touches no field of the review.
 *  6. ONLY AN ADMIN MOVES `status`, and only an author edits words. Neither can do
 *     the other's job: a moderator may take a review down and may not rewrite what
 *     somebody said.
 *
 * And the honest limit: a confirmed claim is only as good as the owner who
 * confirmed it. See residence.service.ts, which says the same thing at more length.
 */

export type Actor = { id: string; roles: readonly Role[] };

function isAdmin(actor: Actor): boolean {
  return actor.roles.includes("ADMIN");
}

/** What `toPublicReview` needs: the period and status behind it, and who wrote it. */
const PUBLIC_INCLUDE = {
  residence: { select: { status: true, movedInAt: true, movedOutAt: true } },
  author: { select: { id: true, firstName: true, lastName: true } },
} as const;

/** What the author's own view needs instead: which listing, and their real dates. */
const MINE_INCLUDE = {
  residence: { select: { status: true, movedInAt: true, movedOutAt: true } },
  property: {
    select: {
      id: true,
      title: true,
      address: true,
      city: true,
      state: true,
      images: { select: { url: true, position: true }, orderBy: { position: "asc" } },
    },
  },
} as const;

/** The admin queue needs the complaint, the review, its author and its listing. */
const REPORT_INCLUDE = {
  reporter: { select: { id: true, firstName: true, lastName: true } },
  review: {
    include: {
      ...PUBLIC_INCLUDE,
      property: {
        select: {
          id: true,
          title: true,
          address: true,
          city: true,
          state: true,
          images: { select: { url: true, position: true }, orderBy: { position: "asc" } },
        },
      },
    },
  },
} as const;

export type ReviewListResult<T> = {
  reviews: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function paginate(total: number, page: number, pageSize: number) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/**
 * The listing exists and is public, or 404.
 *
 * Uses the same status list as `getPropertyById`, imported rather than repeated:
 * reviews are read on the listing page, so a property whose page is a 404 must not
 * have a readable review list hanging off it. Two copies of that list would drift
 * and the mismatch would be invisible until somebody noticed reviews surviving a
 * suspension.
 */
async function requirePublicProperty(propertyId: string): Promise<string> {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, status: { in: PUBLICLY_LISTABLE } },
    select: { id: true },
  });
  if (!property) throw new NotFoundError("Property not found");
  return property.id;
}

/* ------------------------------------------------------------------ writes -- */

/**
 * Writing a review of a place you lived.
 *
 * The residence claim does all the authorization work. It is looked up by id AND
 * `userId: actor.id` AND `propertyId` from the path, so all three have to agree —
 * a claim that is somebody else's, or is real but for a different property, is
 * indistinguishable from one that does not exist.
 *
 * `propertyId` on the review is copied from the residence row, never from the
 * request. That is the line that stops a review of one flat being filed against
 * another, and it is why the path's id is used only as a filter.
 *
 * `status` is not passed at all. The column defaults to PUBLISHED, so there is no
 * statement here that could be edited into letting a client publish something
 * already hidden, or hide something on creation.
 */
export async function createReview(
  actor: Actor,
  propertyId: string,
  input: CreateReviewInput,
): Promise<MyReview> {
  const residence = await prisma.residenceHistory.findFirst({
    where: { id: input.residenceId, userId: actor.id, propertyId },
    select: {
      id: true,
      propertyId: true,
      status: true,
      property: { select: { title: true, owner: { select: { email: true } } } },
    },
  });
  // Not "that claim is not yours" and not "wrong property" — one 404 for all three,
  // because distinguishing them tells a stranger which ids exist.
  if (!residence) throw new NotFoundError("Residence claim not found");

  if (residence.status === ResidenceStatus.REJECTED) {
    throw new ConflictError(
      "The property owner did not accept your residence claim, so you cannot review this place.",
    );
  }

  let created;
  try {
    created = await prisma.propertyReview.create({
      data: {
        residenceId: residence.id,
        // From the claim, not from the path and not from the body.
        propertyId: residence.propertyId,
        authorId: actor.id,
        overall: input.overall,
        water: input.water,
        power: input.power,
        security: input.security,
        landlord: input.landlord,
        body: input.body,
      },
      include: MINE_INCLUDE,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError(
        "You have already reviewed that tenancy. Edit your existing review instead.",
      );
    }
    throw err;
  }

  if (residence.property.owner?.email) {
    void notify(() =>
      sendReviewPostedEmail({
        to: residence.property.owner!.email,
        title: residence.property.title,
        overall: created.overall,
        verified: residence.status === ResidenceStatus.CONFIRMED,
        propertyUrl: `${frontendBaseUrl}/properties/${residence.propertyId}`,
      }),
    );
  }

  return toMyReview(created);
}

/**
 * The author revising their own review.
 *
 * `authorId: actor.id` is in the WHERE clause, with no admin widening: an admin
 * who thinks a review should say something different does not get to make it say
 * that. Their power over a review is `status`, and only `status`.
 *
 * A moderated review is not editable. Once an admin has hidden or removed one,
 * editing it back into shape would be a way around the decision — and the author
 * being told so plainly is more use than a silent no-op.
 */
export async function updateReview(
  actor: Actor,
  id: string,
  input: UpdateReviewInput,
): Promise<MyReview> {
  const existing = await prisma.propertyReview.findFirst({
    where: { id, authorId: actor.id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError("Review not found");

  if (existing.status !== ReviewStatus.PUBLISHED) {
    throw new ConflictError(
      "This review has been taken down by an admin, so it can no longer be edited.",
    );
  }

  const updated = await prisma.propertyReview.update({
    where: { id: existing.id },
    // Spread as validated: the schema has no `status`, no `propertyId`, no
    // `residenceId` and no author, so there is nothing here to strip.
    data: input,
    include: MINE_INCLUDE,
  });

  return toMyReview(updated);
}

/**
 * Reporting a review.
 *
 * Deliberately inert. It writes one row in `ReviewReport` and touches NO field of
 * the review — not its status, not a counter, nothing. A landlord able to hide a
 * bad review by reporting it would make every good rating on the platform
 * worthless, so the ability simply does not exist in this function.
 *
 * You cannot report your own, which is not about abuse so much as sense: the
 * author can edit it. And you cannot report the same review twice — a unique index
 * on (reviewId, reporterId) makes a second attempt a friendly 409 rather than a way
 * to make one complaint look like ten in the queue.
 */
export async function reportReview(
  actor: Actor,
  reviewId: string,
  reason: string,
): Promise<{ reported: true }> {
  const review = await prisma.propertyReview.findUnique({
    where: { id: reviewId },
    select: { id: true, authorId: true },
  });
  if (!review) throw new NotFoundError("Review not found");

  if (review.authorId === actor.id) {
    throw new ConflictError("This is your own review — you can edit it instead.");
  }

  try {
    await prisma.reviewReport.create({
      data: { reviewId: review.id, reporterId: actor.id, reason },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError("You have already reported this review. An admin will look at it.");
    }
    throw err;
  }

  logger.info({ reviewId: review.id }, "review reported");
  return { reported: true };
}

export type ModerationResult = {
  id: string;
  status: ReviewStatus;
  /** Outstanding reports this decision closed. */
  reportsResolved: number;
};

/**
 * An admin's decision on a reported review.
 *
 * Two writes in one transaction: the review's status, and every outstanding report
 * against it marked resolved. They belong together — a queue that still shows a
 * complaint an admin has already acted on is a queue people stop trusting, and the
 * two drifting apart is exactly what a half-applied pair of updates produces.
 *
 * Setting PUBLISHED on an already-published review is how a report is DISMISSED:
 * the reports close, the review stays up. That is why there is no separate dismiss
 * endpoint — one that could drift out of step with this one.
 *
 * `note` goes to the log rather than to a column. It is an admin's aside about why
 * they decided as they did; giving it a column would eventually mean deciding
 * whether the author gets to read it, and the answer to a question nobody has asked
 * yet should not be a schema change made in advance.
 */
export async function moderateReview(
  actor: Actor,
  id: string,
  input: ModerateReviewInput,
): Promise<ModerationResult> {
  const existing = await prisma.propertyReview.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError("Review not found");

  const [updated, resolved] = await prisma.$transaction([
    prisma.propertyReview.update({
      where: { id: existing.id },
      data: { status: input.status },
      select: { id: true, status: true },
    }),
    prisma.reviewReport.updateMany({
      where: { reviewId: existing.id, resolvedAt: null },
      data: { resolvedAt: new Date() },
    }),
  ]);

  logger.info(
    {
      reviewId: existing.id,
      from: existing.status,
      to: input.status,
      actorId: actor.id,
      ...(input.note ? { note: input.note } : {}),
    },
    "review moderated",
  );

  return { id: updated.id, status: updated.status, reportsResolved: resolved.count };
}

/* ------------------------------------------------------------------- reads -- */

/**
 * The reviews on a listing page.
 *
 * PUBLISHED only. A hidden or removed review is gone from every public read here,
 * which is the one place the moderation status does any work.
 *
 * Unverified reviews are included by default and carry `verified: false` so the
 * page can say what they are. `verifiedOnly=true` is a reader's choice, not the
 * platform's — the default cannot be "hide the unconfirmed ones", because the
 * person who decides whether a claim is confirmed is the person being reviewed.
 *
 * @param viewerId the signed-in reader, or null. Used only to set `mine`.
 */
export async function listPropertyReviews(
  propertyId: string,
  q: ListReviewsQuery,
  viewerId: string | null,
): Promise<ReviewListResult<PublicReview>> {
  await requirePublicProperty(propertyId);

  const where: Prisma.PropertyReviewWhereInput = {
    propertyId,
    status: ReviewStatus.PUBLISHED,
    ...(q.verifiedOnly ? { residence: { status: ResidenceStatus.CONFIRMED } } : {}),
  };
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.propertyReview.findMany({
      where,
      include: PUBLIC_INCLUDE,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.propertyReview.count({ where }),
  ]);

  return {
    reviews: rows.map((r) => toPublicReview(r, viewerId)),
    ...paginate(total, q.page, q.pageSize),
  };
}

/**
 * The aggregate above a listing's reviews.
 *
 * Three counts, deliberately separate rather than one number:
 *
 *  - the VERIFIED average, over published reviews whose claim the owner confirmed.
 *    This is the only average, and it is the only thing that may ever be called a
 *    rating.
 *  - how many published reviews came from unconfirmed claims, so the page can show
 *    them and say so without folding them into the number above.
 *  - how many confirmed tenancies exist at all, review or not. "Four people have
 *    lived here and one has reviewed it" is a more honest summary than one review
 *    presented alone.
 *
 * At zero verified reviews the averages are NULL, not zero. A zero would render as
 * one star out of five — a rating this platform invented about somebody's home
 * because nobody had reviewed it yet. See `toExperienceSummary`.
 */
export async function experienceSummary(propertyId: string): Promise<ExperienceSummary> {
  await requirePublicProperty(propertyId);

  const published = { propertyId, status: ReviewStatus.PUBLISHED } as const;

  const [agg, unverifiedCount, residents] = await Promise.all([
    prisma.propertyReview.aggregate({
      where: { ...published, residence: { status: ResidenceStatus.CONFIRMED } },
      _avg: { overall: true, water: true, power: true, security: true, landlord: true },
      _count: { _all: true },
    }),
    prisma.propertyReview.count({
      where: { ...published, residence: { status: { not: ResidenceStatus.CONFIRMED } } },
    }),
    prisma.residenceHistory.count({
      where: { propertyId, status: ResidenceStatus.CONFIRMED },
    }),
  ]);

  return toExperienceSummary({
    propertyId,
    verifiedCount: agg._count._all,
    averages: agg._avg,
    unverifiedCount,
    residents,
  });
}

/**
 * The caller's own reviews.
 *
 * Every status, including the ones an admin has taken down: being told your review
 * was hidden is the difference between moderation and a review that silently
 * stopped existing. Scoped to `authorId: actor.id` with no admin widening, for the
 * same reason `/properties/mine` is — "mine" means mine.
 */
export async function listMyReviews(
  actor: Actor,
  q: ListReviewsQuery,
): Promise<ReviewListResult<MyReview>> {
  const where: Prisma.PropertyReviewWhereInput = { authorId: actor.id };
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.propertyReview.findMany({
      where,
      include: MINE_INCLUDE,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.propertyReview.count({ where }),
  ]);

  return { reviews: rows.map(toMyReview), ...paginate(total, q.page, q.pageSize) };
}

/**
 * The admin report queue.
 *
 * Outstanding first and oldest first, the same fairness argument as the residence
 * queue: somebody is waiting on each of these, and the fair order is the order they
 * asked in. `resolved=true` shows what has already been handled, because a queue
 * you cannot audit after the fact is not a moderation record.
 *
 * Admin-only, checked here as well as on the route. The route gate is what returns
 * 403; this is what makes a future caller that forgets the gate fail loudly instead
 * of leaking every complaint on the platform.
 */
export async function listReportedReviews(
  actor: Actor,
  q: ListReportsQuery,
): Promise<ReviewListResult<ReportedReview>> {
  if (!isAdmin(actor)) throw new NotFoundError("Not found");

  const where: Prisma.ReviewReportWhereInput = {
    resolvedAt: q.resolved ? { not: null } : null,
  };
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.reviewReport.findMany({
      where,
      include: REPORT_INCLUDE,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.reviewReport.count({ where }),
  ]);

  return { reviews: rows.map(toReportedReview), ...paginate(total, q.page, q.pageSize) };
}

/**
 * Email, after the write, and never able to fail the request.
 *
 * The review is published and visible on the listing; a mail server hiccup must
 * not roll that back or surface as an error for something that succeeded.
 */
async function notify(send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (err) {
    logger.error({ err }, "failed to send review email");
  }
}
