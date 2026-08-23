import { Prisma, PropertySource, PropertyStatus, type Role } from "@prisma/client";

import { ConflictError, NotFoundError, ValidationError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { fullName } from "../users/user.serializer";
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
    ];
  }

  return where;
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
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
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
      include: { images: true },
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
    include: { images: true },
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

  if (existing.status === PropertyStatus.VERIFIED) {
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
    return tx.property.update({
      where: { id: existing.id },
      data,
      include: { images: true },
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

  const updated = await prisma.property.update({
    where: { id: existing.id },
    data: { status: PropertyStatus.PENDING_VERIFICATION },
    include: { images: true },
  });
  return toOwnerProperty(updated);
}

/**
 * Admin decision on a listing's status.
 *
 * Separate from `updateProperty` on purpose: this is the ONE path that can put
 * a listing into VERIFIED, and it is reachable only behind
 * `requireRole("ADMIN")`. The richer verification workflow — a reason the owner
 * can read, an audit trail of who decided what, a notification — is still to
 * come; this closes the state machine so an edited listing can get its badge
 * back.
 */
export async function setPropertyStatus(
  id: string,
  status: PropertyStatus,
): Promise<OwnerProperty> {
  const existing = await prisma.property.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError("Property not found");

  const updated = await prisma.property.update({
    where: { id },
    data: { status },
    include: { images: true },
  });
  return toOwnerProperty(updated);
}
