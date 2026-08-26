import {
  InspectionStatus,
  Prisma,
  PropertyStatus,
  ResidenceStatus,
  type Role,
} from "@prisma/client";

import { frontendBaseUrl } from "../../config/env";
import { ConflictError, NotFoundError } from "../../lib/errors";
import { prisma } from "../../lib/prisma";
import { sendResidenceClaimEmail, sendResidenceDecisionEmail } from "../../lib/email";
import { logger } from "../../lib/logger";
import {
  toMyResidence,
  toOwnerResidence,
  type OwnerResidence,
  type SerializedResidence,
} from "./residence.serializer";
import type { CreateResidenceInput, ListResidencesQuery } from "./residence.schemas";

/**
 * Residence claims: a person saying they lived somewhere, and the property
 * owner's answer.
 *
 * This module exists to answer one question — "should I believe a review of this
 * flat" — and everything in it is shaped by the fact that a claim is an assertion
 * about SOMEBODY ELSE'S property that the platform cannot observe.
 *
 * WHAT STOPS SOMEONE CLAIMING AN ARBITRARY PROPERTY. No single thing; four,
 * because each one alone is insufficient:
 *
 *  1. A claim confers nothing. It is UNVERIFIED, it is labelled that way
 *     everywhere it is shown, and its review is excluded from the verified
 *     average. Claiming is free; being believed is not.
 *  2. Only the property's OWNER or an ADMIN can confirm, and ownership is the
 *     WHERE clause rather than a check afterwards — so holding the LANDLORD role
 *     gets you nothing on somebody else's listing.
 *  3. Nobody confirms their own. Refused here, and refused again by a CHECK
 *     constraint in the database, because it is the one failure that would make
 *     the whole feature worthless.
 *  4. Outstanding claims are capped per account (`MAX_OPEN_CLAIMS`), so a bad
 *     actor cannot spray a claim across the whole catalogue and hope that some
 *     fraction of landlords click yes without reading.
 *
 * And what this does NOT claim: an owner can confirm a claim that is false,
 * whether carelessly or in collusion with a fake reviewer. Making that impossible
 * needs tenancy documents this platform does not ask for. What is achieved is
 * that a false confirmed claim requires the owner's participation and leaves
 * their id on the row.
 *
 * A miss is 404, never 403, as everywhere else here: "exists, not yours" and
 * "does not exist" must be indistinguishable to a stranger guessing ids.
 */

export type Actor = { id: string; roles: readonly Role[] };

function isAdmin(actor: Actor): boolean {
  return actor.roles.includes("ADMIN");
}

/**
 * How many undecided claims one account may have at a time.
 *
 * A real residence history is a handful of places, and they are not all waiting
 * on a landlord at once. Five is comfortably above what an honest person needs
 * while making a scattergun attempt across the catalogue impossible to complete —
 * and unlike a rate limit it does not expire, so waiting does not help. The bound
 * is on UNDECIDED claims specifically: someone with fifteen confirmed tenancies
 * has fifteen landlords who vouched for them, which is the opposite of suspicious.
 */
const MAX_OPEN_CLAIMS = 5;

/**
 * Properties a residence claim may name.
 *
 * Not the same set a viewing request may name, and for the opposite reason: a
 * viewing is about a place on offer NOW, while a claim is about the past. A
 * SUSPENDED or REJECTED listing is still somewhere a person lived, and its
 * reviews are arguably the most useful ones on the platform.
 *
 * DRAFT is excluded. A draft has never been public, so a claim against one is
 * either a mistake or somebody probing ids — and it gets the same 404 the public
 * read gives, which is what makes the two indistinguishable.
 */
const CLAIMABLE: PropertyStatus[] = [
  PropertyStatus.VERIFIED,
  PropertyStatus.PENDING_VERIFICATION,
  PropertyStatus.REJECTED,
  PropertyStatus.SUSPENDED,
];

/** Everything the claimant's serializer needs, in one include. */
const MINE_INCLUDE = {
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
  // Presence only. Whether a review exists decides which button the row shows;
  // its contents belong to the property page.
  review: { select: { id: true } },
} as const;

/** The owner's queue additionally needs who is claiming. */
const OWNER_INCLUDE = {
  ...MINE_INCLUDE,
  user: { select: { id: true, firstName: true, lastName: true } },
} as const;

export type ResidenceListResult<T> = {
  residences: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function paginate(total: number, page: number, pageSize: number) {
  return { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/**
 * A COMPLETED viewing by this person on this property, if the platform has one.
 *
 * The only independent evidence available here: the landlord themselves marked
 * that the viewing happened, which means this person turned up at that address.
 * It does not prove a tenancy — plenty of people view a flat and take another —
 * but it is a fact the platform recorded rather than a claim someone typed, and it
 * is what the owner is shown when they decide.
 *
 * Computed by the SERVER at claim time and never accepted from a request body: a
 * client that could set this would be manufacturing its own corroboration.
 *
 * It is a snapshot of what was known when the claim was made. A viewing marked
 * COMPLETED afterwards will not appear — deliberately not chased, because in that
 * ordering the landlord is the one who marked it, so they already know. Stated
 * here so nobody later reads a null as "no viewing ever happened".
 */
async function corroboratingInspectionId(
  userId: string,
  propertyId: string,
): Promise<string | null> {
  const done = await prisma.inspection.findFirst({
    where: { tenantId: userId, propertyId, status: InspectionStatus.COMPLETED },
    select: { id: true },
    orderBy: { preferredAt: "desc" },
  });
  return done?.id ?? null;
}

/**
 * Somebody claims they lived at a property.
 *
 * Four refusals, all here rather than on the client:
 *
 *  1. The property has to be one that has been public (see `CLAIMABLE`).
 *  2. Not your own listing. You do not rent from yourself, and a claim against a
 *     property you own would be a claim only you could confirm — which is the
 *     self-verification hole, arriving by the front door.
 *  3. Not more than `MAX_OPEN_CLAIMS` undecided at once.
 *  4. Not the same claim twice. Enforced by a unique index on (userId,
 *     propertyId, movedInAt) so two taps on a slow connection cannot both land;
 *     P2002 is caught below and turned into a sentence rather than a raw
 *     constraint name.
 *
 * The owner is emailed after the write, and a mail failure cannot undo the claim.
 */
export async function claimResidence(
  actor: Actor,
  input: CreateResidenceInput,
): Promise<SerializedResidence> {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, status: { in: CLAIMABLE } },
    select: {
      id: true,
      title: true,
      ownerId: true,
      owner: { select: { email: true } },
    },
  });
  // The same 404 the public read gives for a draft. Whether this id is a listing
  // that was never published or no listing at all is not something to disclose.
  if (!property) throw new NotFoundError("Property not found");

  if (property.ownerId === actor.id) {
    throw new ConflictError(
      "This is your own listing — a residence claim is for somewhere you rented.",
    );
  }

  const open = await prisma.residenceHistory.count({
    where: { userId: actor.id, status: ResidenceStatus.UNVERIFIED },
  });
  if (open >= MAX_OPEN_CLAIMS) {
    throw new ConflictError(
      `You have ${open} residence claims still waiting to be confirmed. Wait for those before adding another.`,
    );
  }

  const corroboratedByInspectionId = await corroboratingInspectionId(actor.id, property.id);

  let created;
  try {
    created = await prisma.residenceHistory.create({
      data: {
        userId: actor.id,
        propertyId: property.id,
        movedInAt: input.movedInAt,
        movedOutAt: input.movedOutAt ?? null,
        note: input.note ?? null,
        corroboratedByInspectionId,
        // `status` is not set. The column defaults to UNVERIFIED, and leaving it
        // to the default means there is no line here that could ever be edited
        // into creating a pre-confirmed claim.
      },
      include: MINE_INCLUDE,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ConflictError(
        "You have already recorded living here from that date. Check your residence history.",
      );
    }
    throw err;
  }

  if (property.owner?.email) {
    void notify(() =>
      sendResidenceClaimEmail({
        to: property.owner!.email,
        title: property.title,
        movedInAt: created.movedInAt,
        movedOutAt: created.movedOutAt,
        corroborated: Boolean(corroboratedByInspectionId),
        ...(input.note ? { note: input.note } : {}),
        queueUrl: `${frontendBaseUrl}/landlord/residences`,
      }),
    );
  } else {
    // Seeded and imported listings have no account behind them, so nobody can
    // ever confirm a claim against one. Worth a line: otherwise a claim that will
    // sit UNVERIFIED forever looks like a delivery failure.
    logger.info(
      { propertyId: property.id },
      "residence claim not emailed — no owner account on the property",
    );
  }

  return toMyResidence(created);
}

/**
 * The claims this person has made.
 *
 * Scoped to `userId: actor.id` with no admin override, deliberately: an admin
 * asking for "my residence history" wants their own. The admin view of everyone's
 * claims is the incoming queue, which widens for them.
 */
export async function listMyResidences(
  actor: Actor,
  q: ListResidencesQuery,
): Promise<ResidenceListResult<SerializedResidence>> {
  const where: Prisma.ResidenceHistoryWhereInput = {
    userId: actor.id,
    ...(q.status ? { status: q.status } : {}),
  };
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.residenceHistory.findMany({
      where,
      include: MINE_INCLUDE,
      orderBy: [{ movedInAt: "desc" }, { id: "desc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.residenceHistory.count({ where }),
  ]);

  return {
    residences: rows.map(toMyResidence),
    ...paginate(total, q.page, q.pageSize),
  };
}

/**
 * Claims made against this owner's properties.
 *
 * Ownership is the WHERE clause (`property: { ownerId }`), so a landlord holding
 * the right role still sees only claims against their own properties. An admin
 * sees every claim, which is what makes the admin view possible and what lets
 * somebody act on a claim against a property whose owner has gone quiet.
 *
 * Oldest first, unlike the viewing queue. A viewing is time-sensitive and sorts
 * by when it is due; a residence claim is not, and the fair order for something a
 * person is waiting on is the order they asked in.
 */
export async function listIncomingResidences(
  actor: Actor,
  q: ListResidencesQuery,
): Promise<ResidenceListResult<OwnerResidence>> {
  const where: Prisma.ResidenceHistoryWhereInput = {
    ...(isAdmin(actor) ? {} : { property: { ownerId: actor.id } }),
    ...(q.status ? { status: q.status } : {}),
  };
  const skip = (q.page - 1) * q.pageSize;

  const [rows, total] = await Promise.all([
    prisma.residenceHistory.findMany({
      where,
      include: OWNER_INCLUDE,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      skip,
      take: q.pageSize,
    }),
    prisma.residenceHistory.count({ where }),
  ]);

  return {
    residences: rows.map(toOwnerResidence),
    ...paginate(total, q.page, q.pageSize),
  };
}

/**
 * The owner's answer: yes they lived here, or no they did not.
 *
 * The dates are never touched. An owner who remembers the tenancy differently
 * rejects and says so — silently rewriting the period would leave the claimant
 * with a confirmed record they never made, and it is their history.
 *
 * A decided claim is refused rather than overwritten. Unlike a viewing (where
 * CONFIRMED may still become COMPLETED because the appointment has an outcome), a
 * residence decision is about a fact and there is nothing further to record. If an
 * owner genuinely got it wrong, an admin has the wider scope — and the row keeps
 * who decided it, so the correction is attributable rather than invisible.
 *
 * Rejected rows are KEPT. A rejected claim is the record that somebody tried, and
 * deleting it would hand them a clean slate to try again from.
 */
async function decide(
  actor: Actor,
  id: string,
  // Narrowed off the enum rather than spelled as bare literals, so renaming a
  // status in the schema breaks the build here instead of silently widening this.
  status: Extract<ResidenceStatus, "CONFIRMED" | "REJECTED">,
  reason: string | null,
): Promise<OwnerResidence> {
  const existing = await prisma.residenceHistory.findFirst({
    where: {
      id,
      ...(isAdmin(actor) ? {} : { property: { ownerId: actor.id } }),
    },
    select: {
      id: true,
      userId: true,
      status: true,
      movedInAt: true,
      movedOutAt: true,
      property: { select: { id: true, title: true } },
      user: { select: { email: true } },
    },
  });
  if (!existing) throw new NotFoundError("Residence claim not found");

  // Nobody verifies their own. Unreachable for a landlord — claiming your own
  // property is refused at claim time — but an ADMIN's scope is every claim
  // including their own, and an admin confirming their own tenancy is exactly the
  // self-verification this domain cannot allow. The database has the same rule as
  // a CHECK constraint; this is here so the answer is a sentence rather than a
  // 500 from a constraint violation.
  if (existing.userId === actor.id) {
    throw new ConflictError("You cannot decide on your own residence claim.");
  }

  if (existing.status !== ResidenceStatus.UNVERIFIED) {
    throw new ConflictError(
      `This claim has already been ${existing.status.toLowerCase()}.`,
    );
  }

  const updated = await prisma.residenceHistory.update({
    where: { id: existing.id },
    data: {
      status,
      confirmedById: actor.id,
      decidedAt: new Date(),
      decisionReason: reason,
    },
    include: OWNER_INCLUDE,
  });

  if (existing.user.email) {
    void notify(() =>
      sendResidenceDecisionEmail({
        to: existing.user.email,
        title: existing.property.title,
        status,
        movedInAt: existing.movedInAt,
        movedOutAt: existing.movedOutAt,
        ...(reason ? { reason } : {}),
        // On a confirmation this is where they go to write the review they have
        // just become entitled to; on a rejection it is where they check what
        // they got wrong.
        // `/tenant`, not `/mover`: the frontend routes both roles to the same
        // dashboard area (`roleHomePath.MOVER === "/tenant"`), because an
        // outgoing tenant documenting where they lived is the same person one
        // step further along. There is no `/mover` route to send them to.
        historyUrl: `${frontendBaseUrl}/tenant/residences`,
      }),
    );
  }

  return toOwnerResidence(updated);
}

export function confirmResidence(actor: Actor, id: string): Promise<OwnerResidence> {
  return decide(actor, id, ResidenceStatus.CONFIRMED, null);
}

export function rejectResidence(
  actor: Actor,
  id: string,
  reason: string,
): Promise<OwnerResidence> {
  return decide(actor, id, ResidenceStatus.REJECTED, reason);
}

/**
 * The claimant withdraws a claim nobody has decided on yet.
 *
 * Theirs alone, and only while UNVERIFIED. Someone who picked the wrong flat off
 * a search page needs a way to take it back — otherwise it sits in a stranger's
 * queue forever and the unique index stops them correcting it.
 *
 * Deleted rather than marked withdrawn, and only in this one state, because an
 * undecided claim has no history worth keeping: nobody has acted on it and no
 * review can exist for it. A DECIDED claim is never removable by its claimant —
 * that would let somebody delete a rejection and immediately re-submit it, which
 * is precisely what keeping rejected rows is for.
 */
export async function withdrawResidence(actor: Actor, id: string): Promise<void> {
  const existing = await prisma.residenceHistory.findFirst({
    where: { id, userId: actor.id },
    select: { id: true, status: true },
  });
  if (!existing) throw new NotFoundError("Residence claim not found");

  if (existing.status !== ResidenceStatus.UNVERIFIED) {
    throw new ConflictError(
      `This claim was already ${existing.status.toLowerCase()} — it stays on your history.`,
    );
  }

  await prisma.residenceHistory.delete({ where: { id: existing.id } });
}

/**
 * Email, after the write, and never able to fail the request.
 *
 * The claim or the decision is already recorded and both sides can see it on
 * their dashboard; a mail server hiccup must not roll that back or surface as an
 * error for something that succeeded.
 */
async function notify(send: () => Promise<void>): Promise<void> {
  try {
    await send();
  } catch (err) {
    logger.error({ err }, "failed to send residence email");
  }
}
