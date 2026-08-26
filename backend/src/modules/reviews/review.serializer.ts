import type {
  Property,
  PropertyImage,
  PropertyReview,
  ResidenceHistory,
  ReviewReport,
  ReviewStatus,
  User,
} from "@prisma/client";

/**
 * Review serialization.
 *
 * Three shapes, because a review is read by three people with three different
 * legitimate interests:
 *
 *  - `toPublicReview` — a stranger deciding whether to rent the flat. Gets the
 *    words, the scores, whether the tenancy was confirmed, and roughly when.
 *  - `toMyReview` — the author, who needs their own text back to edit it and needs
 *    to know if a moderator has taken it down.
 *  - `toReportedReview` — an admin deciding what to do about a complaint. The only
 *    shape that carries account ids, because acting on an account needs one.
 *
 * WHAT A STRANGER IS NOT GIVEN, and why each omission is deliberate:
 *
 *  - A FULL NAME. "Ada S." A review says where a person lived and when. Publishing
 *    a full name beside that is publishing someone's address history, which is not
 *    what they agreed to when they reviewed a flat.
 *  - AN ACCOUNT ID. Ids are stable, so exposing one would let anybody group every
 *    review by the same person and reconstruct their whole tenancy history in one
 *    pass. `mine` is computed against the session instead, which is the only
 *    question the page actually asks of identity.
 *  - AN EXACT MOVE-IN DATE. Month and year. A reader needs to weigh how recent the
 *    experience is; the day of the month adds nothing to that and a great deal to
 *    identifying who wrote it.
 *
 * `verified` is DERIVED from the residence's CURRENT status every time this runs,
 * and is stored nowhere. Confirming a claim promotes its review; rejecting one
 * demotes it; there is no copy to fall out of step. A stored flag would eventually
 * say "verified" about a claim that had since been rejected — the exact thing the
 * brief forbids.
 */

export type ReviewRatings = {
  overall: number;
  water: number;
  power: number;
  security: number;
  landlord: number;
};

export type PublicReview = {
  id: string;
  /** The residence claim behind it is CONFIRMED. Read live, never stored. */
  verified: boolean;
  ratings: ReviewRatings;
  body: string;
  /** First name and last initial. Never a full name. */
  author: { name: string };
  /** `YYYY-MM`. Month precision, on purpose — see the note above. */
  residedFrom: string;
  /** Absent means they still live there, as everywhere else in this domain. */
  residedTo?: string;
  createdAt: string;
  /** Revised since it was written. Shown so a reader can tell. */
  edited: boolean;
  /** The caller wrote this one. False for anonymous readers. */
  mine: boolean;
};

/** The author's own copy: their full text, their dates, and its moderation state. */
export type MyReview = {
  id: string;
  residenceId: string;
  status: ReviewStatus;
  verified: boolean;
  ratings: ReviewRatings;
  body: string;
  /** Full `YYYY-MM-DD` here. It is their own tenancy; nothing is being protected. */
  residedFrom: string;
  residedTo?: string;
  createdAt: string;
  updatedAt: string;
  property: ReviewListing;
};

/** What an admin sees in the report queue: the complaint and everything behind it. */
export type ReportedReview = {
  reportId: string;
  reason: string;
  reportedAt: string;
  resolvedAt?: string;
  reporter: { id: string; name: string };
  review: {
    id: string;
    status: ReviewStatus;
    verified: boolean;
    ratings: ReviewRatings;
    body: string;
    createdAt: string;
    /** Full name and id: an admin acting on an account needs to know whose. */
    author: { id: string; name: string };
    property: ReviewListing;
  };
};

/** Just enough of the property to know which listing is being talked about. */
export type ReviewListing = {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  image?: string;
};

type PropertySummary = Pick<Property, "id" | "title" | "address" | "city" | "state"> & {
  images?: Pick<PropertyImage, "url" | "position">[];
};

type ResidencePeriod = Pick<ResidenceHistory, "status" | "movedInAt" | "movedOutAt">;

type AuthorSummary = Pick<User, "id" | "firstName" | "lastName">;

export type ReviewWithResidence = PropertyReview & {
  residence: ResidencePeriod;
  author: AuthorSummary;
};

export type ReviewWithProperty = PropertyReview & {
  residence: ResidencePeriod;
  property: PropertySummary;
};

export type ReportWithReview = ReviewReport & {
  reporter: AuthorSummary;
  review: ReviewWithResidence & { property: PropertySummary };
};

/**
 * How long after creation a change counts as an edit.
 *
 * `createdAt` and `updatedAt` are written by the same statement on insert, but
 * they are two separate clock reads and comparing them for exact equality would
 * eventually mark a brand-new review as edited. A second of slack costs nothing:
 * nobody revises a thirty-character minimum inside one.
 */
const EDIT_TOLERANCE_MS = 1_000;

function toListing(p: PropertySummary): ReviewListing {
  // First photo by position, so the same flat looks the same here as on its card.
  const cover = [...(p.images ?? [])].sort((a, b) => a.position - b.position)[0];
  return {
    id: p.id,
    title: p.title,
    address: p.address,
    city: p.city,
    state: p.state,
    ...(cover ? { image: cover.url } : {}),
  };
}

/**
 * "Ada Student" → "Ada S."
 *
 * Sliced off the ISO string elsewhere in this domain for dates; here the surname
 * is reduced to an initial rather than dropped entirely, because two reviews by
 * "Ada" on the same listing are otherwise indistinguishable and a reader trying to
 * work out whether they are hearing one voice or two deserves that much.
 */
function shortName(u: AuthorSummary): string {
  const initial = u.lastName?.trim()?.[0];
  return initial ? `${u.firstName} ${initial}.` : u.firstName;
}

function fullName(u: AuthorSummary): string {
  return `${u.firstName} ${u.lastName}`.trim();
}

/** `@db.Date` back as the calendar date it is, without a timezone shift. */
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** The same, cut to `YYYY-MM`. */
function isoMonth(d: Date): string {
  return d.toISOString().slice(0, 7);
}

function ratingsOf(r: PropertyReview): ReviewRatings {
  return {
    overall: r.overall,
    water: r.water,
    power: r.power,
    security: r.security,
    landlord: r.landlord,
  };
}

function wasEdited(r: PropertyReview): boolean {
  return r.updatedAt.getTime() - r.createdAt.getTime() > EDIT_TOLERANCE_MS;
}

/**
 * @param viewerId the signed-in caller, or null for an anonymous read. Only ever
 * compared — it is never echoed back, so a review's author id stays private even
 * to a caller who already knows their own.
 */
export function toPublicReview(
  r: ReviewWithResidence,
  viewerId: string | null,
): PublicReview {
  return {
    id: r.id,
    verified: r.residence.status === "CONFIRMED",
    ratings: ratingsOf(r),
    body: r.body,
    author: { name: shortName(r.author) },
    residedFrom: isoMonth(r.residence.movedInAt),
    ...(r.residence.movedOutAt ? { residedTo: isoMonth(r.residence.movedOutAt) } : {}),
    createdAt: r.createdAt.toISOString(),
    edited: wasEdited(r),
    mine: viewerId !== null && r.authorId === viewerId,
  };
}

export function toMyReview(r: ReviewWithProperty): MyReview {
  return {
    id: r.id,
    residenceId: r.residenceId,
    status: r.status,
    verified: r.residence.status === "CONFIRMED",
    ratings: ratingsOf(r),
    body: r.body,
    residedFrom: isoDate(r.residence.movedInAt),
    ...(r.residence.movedOutAt ? { residedTo: isoDate(r.residence.movedOutAt) } : {}),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    property: toListing(r.property),
  };
}

export function toReportedReview(row: ReportWithReview): ReportedReview {
  return {
    reportId: row.id,
    reason: row.reason,
    reportedAt: row.createdAt.toISOString(),
    ...(row.resolvedAt ? { resolvedAt: row.resolvedAt.toISOString() } : {}),
    reporter: { id: row.reporter.id, name: fullName(row.reporter) },
    review: {
      id: row.review.id,
      status: row.review.status,
      verified: row.review.residence.status === "CONFIRMED",
      ratings: ratingsOf(row.review),
      body: row.review.body,
      createdAt: row.review.createdAt.toISOString(),
      author: { id: row.review.author.id, name: fullName(row.review.author) },
      property: toListing(row.review.property),
    },
  };
}

/* ------------------------------------------------------ experience summary -- */

export type ExperienceAverages = ReviewRatings;

/**
 * The aggregate a listing page shows above its reviews.
 *
 * `verified.averages` is `null` when the count is zero, and that is the single
 * most important line in this file. A zero would render as a one-star property —
 * a rating the platform invented about somebody's home because nobody had reviewed
 * it yet. Null means "no rating", which is the truth, and the frontend has to
 * handle it rather than divide by zero and hope.
 *
 * The verified average counts ONLY reviews whose residence claim the property's
 * owner confirmed. Unverified reviews are returned as a count so the page can show
 * them and say what they are — never folded into this number, which is the whole
 * point of having a confirmation step at all.
 */
export type ExperienceSummary = {
  propertyId: string;
  verified: { count: number; averages: ExperienceAverages | null };
  /** Published reviews from claims nobody has confirmed. Shown, never averaged. */
  unverifiedCount: number;
  /** Confirmed tenancies, review or not: "N people have lived here". */
  residents: number;
};

/** One decimal place. Two would imply a precision five whole numbers cannot carry. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type RawAverages = {
  overall: number | null;
  water: number | null;
  power: number | null;
  security: number | null;
  landlord: number | null;
};

/**
 * Prisma's `_avg` block into an averages object, or null.
 *
 * Null when the count is zero — the count decides, not the averages, because
 * Prisma also returns nulls for an empty set and reading "null average" as "0.0"
 * is precisely the invented rating this must never produce.
 */
export function toExperienceSummary(input: {
  propertyId: string;
  verifiedCount: number;
  averages: RawAverages;
  unverifiedCount: number;
  residents: number;
}): ExperienceSummary {
  const { averages: a, verifiedCount } = input;

  return {
    propertyId: input.propertyId,
    verified: {
      count: verifiedCount,
      averages:
        verifiedCount > 0
          ? {
              overall: round1(a.overall ?? 0),
              water: round1(a.water ?? 0),
              power: round1(a.power ?? 0),
              security: round1(a.security ?? 0),
              landlord: round1(a.landlord ?? 0),
            }
          : null,
    },
    unverifiedCount: input.unverifiedCount,
    residents: input.residents,
  };
}
