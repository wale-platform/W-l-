import type {
  Property,
  PropertyImage,
  ResidenceHistory,
  ResidenceStatus,
  User,
} from "@prisma/client";

/**
 * Residence claim serialization.
 *
 * Two shapes, because the two sides of a claim need different things:
 *
 *  - `toMyResidence` — what the person who made the claim sees. Carries the
 *    property, their dates, and the owner's decision including its reason.
 *  - `toOwnerResidence` — what the property's owner sees when deciding. Adds who
 *    is claiming, and whether the platform holds any evidence for it.
 *
 * WHAT THE OWNER IS NOT GIVEN: a phone number or an email address. A viewing
 * request hands over a phone number once confirmed because the two people have
 * arranged to meet at a gate and withholding it would be obstruction. A residence
 * claim needs none of that — the owner is answering "do I recognise this person
 * and these dates", which a name, a period and a note answer completely. There is
 * no version of this screen that needs a way to contact the claimant, so there is
 * no field for it.
 *
 * `verified` is DERIVED, here and nowhere else stored. It is `status ===
 * CONFIRMED` read at the moment of serialization, so a claim that is confirmed
 * later carries its review up with it and one that is rejected takes it back
 * down. A stored copy would eventually say "verified" about a claim that had
 * since been rejected, which is exactly the thing the brief forbids.
 */

/** Just enough of the property to recognise which flat this was. */
export type ResidenceListing = {
  id: string;
  title: string;
  address: string;
  city: string;
  state: string;
  image?: string;
};

export type SerializedResidence = {
  id: string;
  status: ResidenceStatus;
  /** `status === "CONFIRMED"`, computed at read time. Never a column. */
  verified: boolean;
  /** `YYYY-MM-DD`. A calendar date, so no time and no offset. */
  movedInAt: string;
  /** Absent means still living there. */
  movedOutAt?: string;
  note?: string;
  /** The owner's or admin's words when they refused. Shown to the claimant. */
  decisionReason?: string;
  decidedAt?: string;
  createdAt: string;
  property: ResidenceListing;
  /** Whether a review has been written for this period yet. */
  hasReview: boolean;
};

/** The owner's view adds who is claiming, and what backs the claim up. */
export type OwnerResidence = SerializedResidence & {
  claimant: { id: string; name: string };
  /**
   * True when the platform holds a COMPLETED viewing by this person on this
   * property. Real evidence they physically turned up, and the strongest signal
   * available without asking for a tenancy agreement — so it is surfaced to the
   * person deciding rather than kept as an internal note.
   */
  corroborated: boolean;
};

type PropertySummary = Pick<Property, "id" | "title" | "address" | "city" | "state"> & {
  images?: Pick<PropertyImage, "url" | "position">[];
};

type ClaimantSummary = Pick<User, "id" | "firstName" | "lastName">;

export type ResidenceWithProperty = ResidenceHistory & {
  property: PropertySummary;
  // Selected as `{ id: true }` — the id is never sent, only its presence is, via
  // `hasReview`. A review's contents belong to the property page, not to this row.
  review?: { id: string } | null;
};
export type ResidenceWithClaimant = ResidenceWithProperty & { user: ClaimantSummary };

function toListing(p: PropertySummary): ResidenceListing {
  // The first photo by position, matching what the listing card shows, so the
  // same flat looks the same in both places.
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
 * A `@db.Date` column back as the `YYYY-MM-DD` it was.
 *
 * Sliced off the ISO string rather than formatted, because the column is stored
 * at UTC midnight and any local-time formatting would shift it a day for half the
 * world. The frontend's date input wants this exact form anyway.
 */
function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function base(r: ResidenceWithProperty): SerializedResidence {
  return {
    id: r.id,
    status: r.status,
    verified: r.status === "CONFIRMED",
    movedInAt: dateOnly(r.movedInAt),
    ...(r.movedOutAt ? { movedOutAt: dateOnly(r.movedOutAt) } : {}),
    ...(r.note ? { note: r.note } : {}),
    ...(r.decisionReason ? { decisionReason: r.decisionReason } : {}),
    ...(r.decidedAt ? { decidedAt: r.decidedAt.toISOString() } : {}),
    createdAt: r.createdAt.toISOString(),
    property: toListing(r.property),
    hasReview: Boolean(r.review),
  };
}

export function toMyResidence(r: ResidenceWithProperty): SerializedResidence {
  return base(r);
}

export function toOwnerResidence(r: ResidenceWithClaimant): OwnerResidence {
  return {
    ...base(r),
    claimant: {
      id: r.user.id,
      name: `${r.user.firstName} ${r.user.lastName}`.trim(),
    },
    corroborated: Boolean(r.corroboratedByInspectionId),
  };
}
