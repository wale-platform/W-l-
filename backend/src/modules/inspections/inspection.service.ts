import { InspectionStatus, Prisma, PropertyStatus, type Role } from "@prisma/client";

import { frontendBaseUrl } from "../../config/env";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { sendInspectionRequestEmail, sendInspectionDecisionEmail } from "../../lib/email";
import { logger } from "../../lib/logger";
import {
  toLandlordInspection,
  toTenantInspection,
  type LandlordInspection,
  type SerializedInspection,
} from "./inspection.serializer";
import type {
  CreateInspectionInput,
  ListInspectionsQuery,
  RespondToInspectionInput,
} from "./inspection.schemas";

/**
 * Inspection requests: a tenant asking to see a property, and the landlord's
 * answer.
 *
 * Two audiences again, as with properties, and the same rule about where
 * authorization lives — in the query, not in the routes and not in the frontend:
 *
 *  - the TENANT sees the requests they made, and may cancel one.
 *  - the listing's OWNER sees the requests made on their listings, and may
 *    answer one. Scoped by `property.ownerId`, so holding the LANDLORD role is
 *    not enough to touch another landlord's requests.
 *
 * A miss is 404, never 403, for the same reason it is on properties: "exists,
 * not yours" and "does not exist" must be indistinguishable to a stranger
 * guessing ids.
 *
 * No money is involved at any point and no code here should ever change that.
 * The advance-fee scam the listing page warns students about IS the inspection
 * fee — "pay ₦5,000 to view" — so an inspection that could carry a charge would
 * be the platform lending that scam its own plumbing.
 */

export type Actor = { id: string; roles: readonly Role[] };

function isAdmin(actor: Actor): boolean {
  return actor.roles.includes("ADMIN");
}

/**
 * Listings a tenant may ask to view.
 *
 * The same set the public catalogue shows, and for the same reason: a DRAFT is
 * not on offer yet, and a SUSPENDED listing was taken down — accepting a viewing
 * request for either would have the platform arranging a meeting at an address
 * it has just decided not to show anyone.
 */
const REQUESTABLE: PropertyStatus[] = [
  PropertyStatus.VERIFIED,
  PropertyStatus.PENDING_VERIFICATION,
];

/** Statuses a landlord can still act on. */
const ANSWERABLE: InspectionStatus[] = [
  InspectionStatus.REQUESTED,
  InspectionStatus.CONFIRMED,
];

/** Everything the landlord's serializer needs, in one include. */
const LANDLORD_INCLUDE = {
  property: {
    select: {
      id: true,
      title: true,
      address: true,
      city: true,
      state: true,
      price: true,
      images: { select: { url: true, position: true }, orderBy: { position: "asc" } },
    },
  },
  tenant: { select: { id: true, firstName: true, lastName: true, phone: true } },
} as const;

/** The tenant's own view needs the listing but not themselves. */
const TENANT_INCLUDE = { property: LANDLORD_INCLUDE.property } as const;

export type InspectionListResult<T> = {
  inspections: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function paginate(total: number, page: number, pageSize: number) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/**
 * A tenant asks to view a listing.
 *
 * Three refusals, all of them here rather than on the client:
 *
 *  1. The listing has to be one that is actually on offer (see `REQUESTABLE`).
 *  2. A landlord cannot request a viewing of their own listing. Not a security
 *     problem — it is their flat — but it would put a request in their own queue
 *     to answer, which is noise, and it is the sort of thing that happens by
 *     accident when someone is signed in as the wrong account.
 *  3. Not twice. Enforced by a partial unique index on (propertyId, tenantId)
 *     WHERE status = 'REQUESTED', so two taps on a slow connection cannot both
 *     land — see the migration. P2002 is caught below and turned into a sentence
 *     the tenant can act on, because a raw 409 "unique constraint failed" is
 *     not one.
 *
 * The landlord is emailed after the commit, and a mail failure cannot undo the
 * request: the tenant is told it was sent, and the landlord will see it on their
 * dashboard whether or not the message arrived.
 */
export async function requestInspection(
  actor: Actor,
  propertyId: string,
  input: CreateInspectionInput,
): Promise<SerializedInspection> {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, status: { in: REQUESTABLE } },
    select: {
      id: true,
      title: true,
      ownerId: true,
      owner: { select: { email: true } },
    },
  });
  // Same 404 as the public read gives for a draft: whether this id is a listing
  // that is not on offer or no listing at all is not something to disclose.
  if (!property) throw new NotFoundError("Property not found");

  if (property.ownerId === actor.id) {
    throw new ConflictError("This is your own listing — you cannot book a viewing of it.");
  }

  let created;
  try {
    created = await prisma.inspection.create({
      data: {
        propertyId: property.id,
        tenantId: actor.id,
        preferredAt: input.preferredAt,
        note: input.note ?? null,
      },
      include: TENANT_INCLUDE,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError(
        "You have already asked to view this place. Wait for the landlord to reply, or cancel your request first.",
      );
    }
    throw err;
  }

  if (property.owner?.email) {
    void notify(() =>
      sendInspectionRequestEmail({
        to: property.owner!.email,
        title: property.title,
        preferredAt: created.preferredAt,
        ...(input.note ? { note: input.note } : {}),
        queueUrl: `${frontendBaseUrl}/landlord/inspections`,
      }),
    );
  } else {
    // Seeded and imported listings have no account behind them. Worth a line:
    // otherwise a request nobody will ever answer looks like a delivery failure.
    logger.info(
      { propertyId: property.id },
      "inspection request not emailed — no owner account on the listing",
    );
  }

  return toTenantInspection(created);
}

/**
 * The requests this tenant has made.
 *
 * Scoped to `tenantId: actor.id` with no admin override, deliberately: an admin
 * looking at "my requests" wants their own, and the admin view of everyone's
 * requests is `listAllInspections`.
 */
export async function listMyInspections(
  actor: Actor,
  q: ListInspectionsQuery,
): Promise<InspectionListResult<SerializedInspection>> {
  const where: Prisma.InspectionWhereInput = {
    tenantId: actor.id,
    ...(q.status ? { status: q.status } : {}),
  };
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      include: TENANT_INCLUDE,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.inspection.count({ where }),
  ]);

  return {
    inspections: rows.map(toTenantInspection),
    ...paginate(total, q.page, q.pageSize),
  };
}

/**
 * The requests made on this landlord's listings.
 *
 * Ownership is the WHERE clause (`property: { ownerId }`), not a check after the
 * fact — a landlord holding the right role still sees only their own listings'
 * requests. An admin sees everything, which is what makes the admin page
 * possible.
 *
 * Ordered by the requested TIME, soonest first, not by when the request arrived.
 * A landlord opening this page needs to know what is happening tomorrow before
 * what was asked most recently — a queue sorted by arrival buries an imminent
 * viewing under three requests for next month.
 */
export async function listIncomingInspections(
  actor: Actor,
  q: ListInspectionsQuery,
): Promise<InspectionListResult<LandlordInspection>> {
  const where: Prisma.InspectionWhereInput = {
    ...(isAdmin(actor) ? {} : { property: { ownerId: actor.id } }),
    ...(q.status ? { status: q.status } : {}),
  };
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.inspection.findMany({
      where,
      include: LANDLORD_INCLUDE,
      orderBy: [{ preferredAt: "asc" }, { id: "desc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.inspection.count({ where }),
  ]);

  return {
    inspections: rows.map(toLandlordInspection),
    ...paginate(total, q.page, q.pageSize),
  };
}

/**
 * The landlord answers: confirmed, declined, or it happened.
 *
 * `preferredAt` is never touched. A landlord who wants a different time declines
 * and says so — rewriting the appointment under the tenant would leave them
 * turning up at the time they proposed, having been told it was confirmed.
 *
 * Already-answered requests are refused rather than overwritten, with one
 * deliberate exception: CONFIRMED may become COMPLETED or DECLINED, because a
 * confirmed viewing does still need an outcome and can still fall through. What
 * is refused is re-deciding something already closed — a DECLINED request cannot
 * be quietly confirmed weeks later, and a CANCELLED one belongs to the tenant.
 */
export async function respondToInspection(
  actor: Actor,
  id: string,
  input: RespondToInspectionInput,
): Promise<LandlordInspection> {
  const existing = await prisma.inspection.findFirst({
    where: {
      id,
      ...(isAdmin(actor) ? {} : { property: { ownerId: actor.id } }),
    },
    select: {
      id: true,
      status: true,
      preferredAt: true,
      property: { select: { title: true } },
      tenant: { select: { email: true } },
    },
  });
  if (!existing) throw new NotFoundError("Inspection request not found");

  if (!ANSWERABLE.includes(existing.status)) {
    throw new ConflictError(
      existing.status === InspectionStatus.CANCELLED
        ? "The tenant cancelled this request."
        : `This request has already been ${existing.status.toLowerCase()}.`,
    );
  }
  if (existing.status === input.status) {
    throw new ConflictError(`This request is already ${input.status.toLowerCase()}.`);
  }
  // COMPLETED means the viewing happened, so it cannot precede confirming one.
  if (
    input.status === InspectionStatus.COMPLETED &&
    existing.status !== InspectionStatus.CONFIRMED
  ) {
    throw new ConflictError("Confirm the viewing before marking it as done.");
  }

  const updated = await prisma.inspection.update({
    where: { id: existing.id },
    data: {
      status: input.status,
      response: input.response ?? null,
      respondedAt: new Date(),
    },
    include: LANDLORD_INCLUDE,
  });

  // COMPLETED is a bookkeeping note between the landlord and us; the tenant was
  // there. The two answers they need to hear about are yes and no.
  if (input.status !== InspectionStatus.COMPLETED && existing.tenant.email) {
    void notify(() =>
      sendInspectionDecisionEmail({
        to: existing.tenant.email,
        title: existing.property.title,
        status: input.status as "CONFIRMED" | "DECLINED",
        preferredAt: existing.preferredAt,
        ...(input.response ? { response: input.response } : {}),
        listingUrl: `${frontendBaseUrl}/properties/${updated.property.id}`,
      }),
    );
  }

  return toLandlordInspection(updated);
}

/**
 * The tenant cancels their own request.
 *
 * Theirs alone — not the landlord's, who declines instead. The row is kept and
 * marked CANCELLED rather than deleted, because a landlord who blocked out
 * Saturday morning should be able to see that it was called off rather than find
 * the request vanished, and because the partial unique index only counts
 * REQUESTED rows, so a cancelled one does not stop them asking again.
 *
 * Cancelling a CONFIRMED viewing is allowed. Someone who cannot make it should
 * say so, and the alternative is a landlord waiting at a gate.
 */
export async function cancelInspection(
  actor: Actor,
  id: string,
): Promise<SerializedInspection> {
  const existing = await prisma.inspection.findFirst({
    where: { id, tenantId: actor.id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError("Inspection request not found");

  if (!ANSWERABLE.includes(existing.status)) {
    throw new ConflictError(
      `This request was already ${existing.status.toLowerCase()} — there is nothing to cancel.`,
    );
  }

  const updated = await prisma.inspection.update({
    where: { id: existing.id },
    data: { status: InspectionStatus.CANCELLED, respondedAt: new Date() },
    include: TENANT_INCLUDE,
  });

  return toTenantInspection(updated);
}

/**
 * Whether this tenant has a live request on a listing.
 *
 * What the listing page's button needs in order to say "you have asked to view
 * this" instead of offering to ask again — and it is a separate, tiny query
 * rather than a field on the property payload because the property payload is
 * public and cached, and this answer is per-viewer.
 */
export async function getMyInspectionFor(
  actor: Actor,
  propertyId: string,
): Promise<SerializedInspection | null> {
  const existing = await prisma.inspection.findFirst({
    where: {
      propertyId,
      tenantId: actor.id,
      status: { in: [InspectionStatus.REQUESTED, InspectionStatus.CONFIRMED] },
    },
    include: TENANT_INCLUDE,
    orderBy: { createdAt: "desc" },
  });

  return existing ? toTenantInspection(existing) : null;
}

/**
 * Email, after the commit, and never able to fail the request.
 *
 * The request or the decision is already recorded and both sides can see it on
 * their dashboard; a mail server hiccup must not roll that back or surface as an
 * error for something that succeeded.
 */
async function notify(send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (err) {
    logger.error({ err }, "failed to send inspection email");
  }
}
