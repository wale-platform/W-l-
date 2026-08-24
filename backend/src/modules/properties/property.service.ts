import { Prisma, PropertySource, PropertyStatus, type Role } from "@prisma/client";

import { frontendBaseUrl } from "../../config/env";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { sendListingDecisionEmail } from "../../lib/email";
import { logger } from "../../lib/logger";
import { fullName } from "../users/user.serializer";
import { deriveAmenityTags } from "./amenity-tags";
import {
  toOwnerProperty,
  toSerializedProperty,
  type OwnerProperty,
  type SerializedProperty,
} from "./property.serializer";
import type {
  CreatePropertyInput,
  ListMyPropertiesQuery,
  ListPropertiesQuery,
  PropertyStatusInput,
  ReviewQueueQuery,
  UpdatePropertyInput,
} from "./property.schemas";

/**
 * Property queries and mutations.
 *
 * Two audiences, two visibility rules:
 *
 *  - The PUBLIC catalogue only ever returns VERIFIED and PENDING_VERIFICATION
 *    listings. DRAFT/REJECTED/SUSPENDED are invisible to it, and
 *    `verifiedOnly=true` narrows further to VERIFIED alone.
 *  - The OWNER surface (`/properties/mine`) returns every status, because a
 *    landlord has to be able to see their own rejected draft.
 *
 * Ownership is enforced HERE, as part of the database query, not by the routes
 * and not by the frontend. See `ownedBy()`.
 */

const PUBLICLY_LISTABLE: PropertyStatus[] = [
  PropertyStatus.VERIFIED,
  PropertyStatus.PENDING_VERIFICATION,
];

/** A listing can be (re)submitted for review from these states only. */
const SUBMITTABLE: PropertyStatus[] = [PropertyStatus.DRAFT, PropertyStatus.REJECTED];

/**
 * The newest audit row, for the owner-facing payload.
 *
 * Every read that returns an `OwnerProperty` includes this, because the reason a
 * listing was rejected travels with the listing — `toOwnerProperty` drops it
 * again unless the row explains the status the listing is in right now.
 */
const LATEST_DECISION = { orderBy: { createdAt: "desc" }, take: 1 } as const;

export type PropertyListResult = {
  properties: SerializedProperty[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type OwnerPropertyListResult = Omit<PropertyListResult, "properties"> & {
  properties: OwnerProperty[];
};

/**
 * Who is asking. Built from `req.user` after `requireAuth`, so `roles` is the
 * full union of primary + granted roles — never the primary role alone.
 */
export type Actor = { id: string; roles: readonly Role[] };

function isAdmin(actor: Actor): boolean {
  return actor.roles.includes("ADMIN");
}

/**
 * The WHERE clause that makes ownership an authorization boundary.
 *
 * Written as a query constraint rather than a load-then-compare check for two
 * reasons. It cannot be forgotten halfway through a handler, and paired with
 * `deleteMany`/`updateMany` it makes authorize-and-act a single atomic
 * statement, so there is no window between "confirmed you own it" and "changed
 * it".
 *
 * A miss surfaces as 404, not 403. A stranger asking about someone else's DRAFT
 * must not be able to tell "exists, not yours" from "does not exist" — that
 * difference alone would confirm the existence of unpublished listings.
 */
function ownedBy(actor: Actor, id: string): Prisma.PropertyWhereInput {
  return isAdmin(actor) ? { id } : { id, ownerId: actor.id };
}

/**
 * `source` is a trust signal on the public listing — "wale" reads as
 * first-party — so it is derived from who is creating the listing and never
 * accepted from the request body.
 */
function sourceFor(actor: Actor): PropertySource {
  if (actor.roles.includes("LANDLORD")) return PropertySource.landlord;
  if (actor.roles.includes("LAWYER")) return PropertySource.agent;
  return PropertySource.wale;
}

function buildWhere(q: ListPropertiesQuery): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = {
    status: q.verifiedOnly ? PropertyStatus.VERIFIED : { in: PUBLICLY_LISTABLE },
  };

  if (q.university) where.university = q.university;
  if (q.type) where.type = q.type;

  // City and state are stored as the landlord typed them ("Yaba", "yaba"), so
  // they are matched case-insensitively rather than by equality. `equals` with
  // `mode` is still an exact match — a filter for "Lagos" must not pull in
  // "Lagos Island" — it just does not care about capitalisation.
  if (q.city) where.city = { equals: q.city, mode: "insensitive" };
  if (q.state) where.state = { equals: q.state, mode: "insensitive" };

  if (q.minBedrooms !== undefined) where.bedrooms = { gte: q.minBedrooms };
  if (q.minBathrooms !== undefined) where.bathrooms = { gte: q.minBathrooms };

  // `hasEvery`: every tag asked for must be present. AND, not OR — someone who
  // ticks "water" and "backup power" is stating two requirements, not offering
  // two alternatives.
  if (q.amenities?.length) where.amenityTags = { hasEvery: q.amenities };

  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    where.price = {
      ...(q.minPrice !== undefined ? { gte: q.minPrice } : {}),
      ...(q.maxPrice !== undefined ? { lte: q.maxPrice } : {}),
    };
  }

  if (q.query) {
    const contains = { contains: q.query, mode: "insensitive" as const };
    where.OR = [
      { title: contains },
      { description: contains },
      { address: contains },
      { city: contains },
      { state: contains },
      { neighborhood: contains },
    ];
  }

  return where;
}

/**
 * Ordering for the public catalogue.
 *
 * Every option ends in `id: "desc"`. Price and creation time are both
 * non-unique, and an ordering with ties is not a stable ordering: rows that
 * compare equal may come back in a different arrangement for each page, which
 * means a listing can appear on two pages or on none. The id tiebreak makes the
 * order total, so `skip`/`take` walks the result set exactly once.
 */
function orderFor(sort: ListPropertiesQuery["sort"]): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { id: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { id: "desc" }];
    case "newest":
      return [{ createdAt: "desc" }, { id: "desc" }];
  }
}

function paginate(total: number, page: number, pageSize: number) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/* ------------------------------------------------------------- Reads -- */

export async function listProperties(q: ListPropertiesQuery): Promise<PropertyListResult> {
  const where = buildWhere(q);
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { images: true },
      orderBy: orderFor(q.sort),
      skip,
      take: q.pageSize,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    properties: rows.map(toSerializedProperty),
    ...paginate(total, q.page, q.pageSize),
  };
}

export async function getPropertyById(id: string): Promise<SerializedProperty | null> {
  const property = await prisma.property.findFirst({
    where: { id, status: { in: PUBLICLY_LISTABLE } },
    include: { images: true },
  });
  return property ? toSerializedProperty(property) : null;
}

/**
 * The caller's own listings, every status.
 *
 * Scoped to `actor.id` even for an admin: "mine" means mine. An admin who needs
 * to see everyone's listings uses the admin surface, not this one.
 */
export async function listOwnedProperties(
  actor: Actor,
  q: ListMyPropertiesQuery,
): Promise<OwnerPropertyListResult> {
  const where: Prisma.PropertyWhereInput = {
    ownerId: actor.id,
    ...(q.status ? { status: q.status } : {}),
  };
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { images: true, verifications: LATEST_DECISION },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    properties: rows.map(toOwnerProperty),
    ...paginate(total, q.page, q.pageSize),
  };
}

/** One of the caller's own listings, any status — what the edit form loads. */
export async function getOwnedProperty(actor: Actor, id: string): Promise<OwnerProperty> {
  const property = await prisma.property.findFirst({
    where: ownedBy(actor, id),
    include: { images: true, verifications: LATEST_DECISION },
  });
  if (!property) throw new NotFoundError("Property not found");
  return toOwnerProperty(property);
}

/* ------------------------------------------------------------ Writes -- */

type ContactDetails = {
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
};

/**
 * Work out the public contact for a listing.
 *
 * Falls back to the creating account's own name and phone, which is what a
 * landlord listing their own flat expects. `contactEmail` is NOT defaulted from
 * the account: the signup email is a login credential, and quietly publishing
 * it on a public listing is not a choice the owner made.
 */
async function resolveContact(
  actor: Actor,
  input: Pick<CreatePropertyInput, "contactName" | "contactPhone" | "contactEmail">,
): Promise<ContactDetails> {
  const contactEmail = input.contactEmail ?? null;

  if (input.contactName && input.contactPhone) {
    return { contactName: input.contactName, contactPhone: input.contactPhone, contactEmail };
  }

  const owner = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { firstName: true, lastName: true, phone: true },
  });

  const contactName = input.contactName ?? (owner ? fullName(owner.firstName, owner.lastName) : "");
  const contactPhone = input.contactPhone ?? owner?.phone ?? "";

  const missing = [
    ...(contactName ? [] : [{ field: "contactName", message: "Who should students contact?" }]),
    ...(contactPhone
      ? []
      : [
          {
            field: "contactPhone",
            message:
              "Add a phone number to your profile, or give a contact number for this listing",
          },
        ]),
  ];
  if (missing.length > 0) throw new ValidationError("Validation failed", missing);

  return { contactName, contactPhone, contactEmail };
}

/**
 * Create a listing.
 *
 * Always DRAFT: nothing reaches the public catalogue just because it was
 * posted. The owner submits it (`submitForVerification`) and an admin decides
 * (`setPropertyStatus`).
 */
export async function createProperty(
  actor: Actor,
  input: CreatePropertyInput,
): Promise<OwnerProperty> {
  const contact = await resolveContact(actor, input);

  const created = await prisma.property.create({
    data: {
      ownerId: actor.id,
      title: input.title,
      description: input.description,
      price: input.price,
      type: input.type,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      address: input.address,
      city: input.city,
      state: input.state,
      amenities: input.amenities,
      amenityTags: deriveAmenityTags(input.amenities),
      availableDate: input.availableDate,
      ...(input.neighborhood !== undefined ? { neighborhood: input.neighborhood } : {}),
      ...(input.university !== undefined ? { university: input.university } : {}),
      ...(input.latitude !== undefined ? { latitude: input.latitude } : {}),
      ...(input.longitude !== undefined ? { longitude: input.longitude } : {}),
      ...contact,
      // Server-derived, never from the body.
      source: sourceFor(actor),
      status: PropertyStatus.DRAFT,
      images: {
        create: input.images.map((url, position) => ({ url, position })),
      },
    },
    include: { images: true },
  });

  return toOwnerProperty(created);
}

/**
 * Edit a listing the caller owns.
 *
 * Editing a VERIFIED listing sends it back to PENDING_VERIFICATION. Without
 * that, "edit after approval" would be a way to launder anything into a
 * verified listing — get a modest flat approved, then rewrite the price and
 * address while keeping the verified badge. The badge has to describe the
 * listing as it currently reads, not as it read when someone last checked.
 *
 * That demotion gets an audit row like any other status change, with a reason
 * saying what caused it. Otherwise the owner sees a verified listing turn amber
 * with no explanation, and an admin picking it out of the queue cannot tell a
 * fresh submission from a listing that was approved and then rewritten — which
 * is exactly the case worth a second look.
 */
export async function updateProperty(
  actor: Actor,
  id: string,
  input: UpdatePropertyInput,
): Promise<OwnerProperty> {
  const existing = await prisma.property.findFirst({
    where: ownedBy(actor, id),
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError("Property not found");

  const { images, ...fields } = input;
  const data: Prisma.PropertyUpdateInput = { ...fields };

  // Tags are derived, never sent: they exist so the amenity filter can match, so
  // they have to be recomputed whenever the words they came from change.
  // Otherwise an edit that removes "Prepaid meter" would leave the listing still
  // answering a prepaid-meter search.
  if (fields.amenities !== undefined) {
    data.amenityTags = deriveAmenityTags(fields.amenities);
  }

  const demoted = existing.status === PropertyStatus.VERIFIED;
  if (demoted) {
    data.status = PropertyStatus.PENDING_VERIFICATION;
  }

  const updated = await prisma.$transaction(async (tx) => {
    // Images are replaced wholesale when the key is present: the client sends
    // the gallery it wants, in order. Absent means "leave the gallery alone".
    if (images !== undefined) {
      await tx.propertyImage.deleteMany({ where: { propertyId: existing.id } });
      if (images.length > 0) {
        await tx.propertyImage.createMany({
          data: images.map((url, position) => ({ propertyId: existing.id, url, position })),
        });
      }
    }
    if (demoted) {
      await tx.propertyVerification.create({
        data: {
          propertyId: existing.id,
          fromStatus: PropertyStatus.VERIFIED,
          toStatus: PropertyStatus.PENDING_VERIFICATION,
          reason: "Edited after it was verified, so it goes back through review.",
          actorId: actor.id,
        },
      });
    }
    return tx.property.update({
      where: { id: existing.id },
      data,
      include: { images: true, verifications: LATEST_DECISION },
    });
  });

  return toOwnerProperty(updated);
}

/**
 * Delete a listing the caller owns.
 *
 * `deleteMany` with the ownership constraint authorizes and deletes in one
 * statement; `count === 0` means either "no such listing" or "not yours", and
 * both answer 404. Images cascade (see schema.prisma).
 *
 * A hard delete is safe while nothing else references Property. Once
 * inspections and payments do, this has to become an archive flag instead —
 * financial records have to stay auditable, and that outlives the listing.
 */
export async function deleteProperty(actor: Actor, id: string): Promise<void> {
  const { count } = await prisma.property.deleteMany({ where: ownedBy(actor, id) });
  if (count === 0) throw new NotFoundError("Property not found");
}

/**
 * Owner action: put a draft (or a rejected listing) into the review queue.
 *
 * Requires at least one photo. A listing with no images cannot be reviewed in
 * any meaningful sense, and PENDING_VERIFICATION is publicly visible, so an
 * empty one would go straight into the catalogue as a blank card.
 *
 * Recorded in the audit trail like an admin decision, with the owner as the
 * actor. A trail holding only the admin half would read as if listings arrived
 * in the queue by themselves, and a resubmission after a rejection is precisely
 * the event a reviewer wants dated: it says the landlord has responded.
 */
export async function submitForVerification(actor: Actor, id: string): Promise<OwnerProperty> {
  const existing = await prisma.property.findFirst({
    where: ownedBy(actor, id),
    select: { id: true, status: true, _count: { select: { images: true } } },
  });
  if (!existing) throw new NotFoundError("Property not found");

  if (!SUBMITTABLE.includes(existing.status)) {
    throw new ConflictError(
      existing.status === PropertyStatus.SUSPENDED
        ? "This listing has been suspended. Contact support to have it reviewed."
        : "This listing has already been submitted for review.",
    );
  }

  if (existing._count.images === 0) {
    // One rule, one reason — so the message says the reason. "Validation failed"
    // is the right umbrella for a body with several problems in it; here it would
    // just be a category label where the owner needs an instruction.
    throw new ValidationError("Add at least one photo before submitting for review", [
      { field: "images", message: "Add at least one photo before submitting for review" },
    ]);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.propertyVerification.create({
      data: {
        propertyId: existing.id,
        fromStatus: existing.status,
        toStatus: PropertyStatus.PENDING_VERIFICATION,
        // No reason: the owner is not explaining themselves to anyone, and an
        // invented one ("Submitted by the owner") would show up on their own
        // dashboard as though somebody had written it to them.
        reason: null,
        actorId: actor.id,
      },
    });
    return tx.property.update({
      where: { id: existing.id },
      data: { status: PropertyStatus.PENDING_VERIFICATION },
      include: { images: true, verifications: LATEST_DECISION },
    });
  });
  return toOwnerProperty(updated);
}

/**
 * Admin decision on a listing's status.
 *
 * The ONE path that can put a listing into VERIFIED, reachable only behind
 * `requireRole("ADMIN")`.
 *
 * Three things happen together, in one transaction: the status changes, the
 * decision is written to the audit trail, and — outside the transaction, because
 * a mail server hiccup must not roll back a decision — the owner is emailed.
 * The audit row is not optional bookkeeping: it carries the reason the landlord
 * is shown, so a rejection with no row would surface to them as a bare
 * "Rejected" with nothing to act on.
 *
 * Deciding the status a listing is already in is refused. It would append a
 * second row saying nothing changed, and "Verified → Verified" in a history
 * somebody is reading to settle a dispute is noise at best.
 */
export async function setPropertyStatus(
  actor: Actor,
  id: string,
  input: PropertyStatusInput,
): Promise<OwnerProperty> {
  const existing = await prisma.property.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      title: true,
      owner: { select: { id: true, email: true } },
    },
  });
  if (!existing) throw new NotFoundError("Property not found");

  if (existing.status === input.status) {
    throw new ConflictError(`This listing is already ${STATUS_WORDS[input.status]}.`);
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.propertyVerification.create({
      data: {
        propertyId: existing.id,
        fromStatus: existing.status,
        toStatus: input.status,
        reason: input.reason ?? null,
        actorId: actor.id,
      },
    });
    return tx.property.update({
      where: { id: existing.id },
      data: { status: input.status },
      include: { images: true, verifications: LATEST_DECISION },
    });
  });

  // After the commit, and never allowed to fail the request: the decision is
  // already made and recorded. A landlord who does not get the email still sees
  // the outcome and the reason on their dashboard.
  if (existing.owner?.email) {
    void notifyOwnerOfDecision({
      to: existing.owner.email,
      title: existing.title,
      status: input.status,
      reason: input.reason,
      propertyId: existing.id,
    });
  } else {
    // Seeded and imported listings have no account behind them. Worth a line:
    // silence here would otherwise look like a delivery failure.
    logger.info(
      { propertyId: existing.id, status: input.status },
      "listing decision not emailed — no owner account on the listing",
    );
  }

  return toOwnerProperty(updated);
}

/** Status as it reads in a sentence to a landlord, not as an enum. */
const STATUS_WORDS: Record<PropertyStatus, string> = {
  DRAFT: "a draft",
  PENDING_VERIFICATION: "waiting for review",
  VERIFIED: "verified",
  REJECTED: "rejected",
  SUSPENDED: "suspended",
};

async function notifyOwnerOfDecision(args: {
  to: string;
  title: string;
  status: PropertyStatus;
  reason?: string;
  propertyId: string;
}): Promise<void> {
  // DRAFT never reaches here — `propertyStatusSchema` does not offer it — but the
  // email copy is keyed by status, so the type has to say so.
  if (args.status === PropertyStatus.DRAFT) return;

  try {
    await sendListingDecisionEmail({
      to: args.to,
      title: args.title,
      status: args.status,
      ...(args.reason ? { reason: args.reason } : {}),
      listingUrl: `${frontendBaseUrl}/landlord/properties/${args.propertyId}/edit`,
    });
  } catch (err) {
    logger.error({ err, propertyId: args.propertyId }, "failed to email listing decision");
  }
}

/**
 * The admin review queue.
 *
 * The counterpart to `/properties/mine`, which is scoped to the caller even for
 * an admin. Without this an admin could only approve a listing whose id they had
 * been given out of band — the decision endpoint existed with no way to find
 * anything to decide.
 *
 * Oldest first, deliberately: a queue sorted newest-first starves whoever has
 * been waiting longest. `updatedAt` rather than the submit time, so a landlord
 * who edits while pending goes to the back — the listing changed and needs
 * reading again from the top.
 */
export async function listReviewQueue(q: ReviewQueueQuery): Promise<OwnerPropertyListResult> {
  const where: Prisma.PropertyWhereInput = { status: q.status };
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.property.findMany({
      where,
      include: { images: true, verifications: LATEST_DECISION },
      orderBy: [{ updatedAt: "asc" }, { id: "desc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    properties: rows.map(toOwnerProperty),
    ...paginate(total, q.page, q.pageSize),
  };
}

export type VerificationEntry = {
  id: string;
  fromStatus: PropertyStatus;
  toStatus: PropertyStatus;
  reason: string | null;
  actor: { id: string; name: string } | null;
  createdAt: string;
};

/**
 * Everything that has happened to one listing's status, newest first.
 *
 * Visible to an admin and to the listing's own owner — a landlord disputing a
 * decision should be able to read the same history the reviewer can. The
 * ownership constraint is `ownedBy`, so a stranger gets 404 rather than a 403
 * that would confirm the listing exists.
 */
export async function getVerificationHistory(
  actor: Actor,
  id: string,
): Promise<VerificationEntry[]> {
  const property = await prisma.property.findFirst({
    where: ownedBy(actor, id),
    select: { id: true },
  });
  if (!property) throw new NotFoundError("Property not found");

  const rows = await prisma.propertyVerification.findMany({
    where: { propertyId: property.id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    include: { actor: { select: { id: true, firstName: true, lastName: true } } },
  });

  return rows.map((row) => ({
    id: row.id,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    reason: row.reason,
    // Name only. An admin's email address is not something a landlord reading
    // their own listing's history needs.
    actor: row.actor
      ? { id: row.actor.id, name: fullName(row.actor.firstName, row.actor.lastName) }
      : null,
    createdAt: row.createdAt.toISOString(),
  }));
}
