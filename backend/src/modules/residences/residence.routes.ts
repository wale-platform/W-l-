import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import * as residenceController from "./residence.controller";
import {
  createResidenceSchema,
  listResidencesQuerySchema,
  rejectResidenceSchema,
  residenceIdParamSchema,
} from "./residence.schemas";

/**
 * Residence routes, mounted at /api/v1/residences.
 *
 * Nothing here is public. A claim names a person, a property and a period, and it
 * is visible only to that person and the property's owner — so every route needs
 * a session, and each one is scoped further inside the service, which is what
 * stops a landlord deciding on another landlord's claims.
 *
 * Who may claim: TENANT, MOVER, ADMIN. A mover is the role this domain was added
 * for, and a tenant has residence history for the same reason. LANDLORD is left
 * out for the same reason it is left out of viewing requests — not because a
 * landlord never rents, but because a landlord who is also renting holds the
 * TENANT role, which is what the multi-role model is for.
 *
 * Who may decide: LANDLORD, LAWYER (acting for a landlord, as with listings),
 * ADMIN. Ownership is still the query's WHERE clause, so the role alone gets you
 * nothing on somebody else's property.
 *
 * ROUTE ORDER: the literal paths are declared before the `:id` ones. They cannot
 * collide as written — every `:id` route has a suffix, except the DELETE, which is
 * a different method from every literal GET here — but relying on that is the kind
 * of thing a later edit breaks silently.
 */
export const residenceRouter = Router();

/* ---------------------------------------------------------- the claimant's -- */

// Recording a place you lived. The property is a field in the body rather than a
// path segment: the claim is what is being created, and unlike a viewing request
// the property's current status is not what decides whether the action is
// possible — the past is not for sale.
residenceRouter.post(
  "/",
  requireAuth,
  requireRole("TENANT", "MOVER", "ADMIN"),
  validateBody(createResidenceSchema),
  asyncHandler(residenceController.claim),
);

// The caller's own claims. No role gate: anyone who can hold a session can have
// lived somewhere, and the query is scoped to them regardless.
residenceRouter.get(
  "/mine",
  requireAuth,
  validateQuery(listResidencesQuerySchema),
  asyncHandler(residenceController.listMine),
);

/* -------------------------------------------------------------- the owner's -- */

// Claims against the caller's own properties — every claim, for an admin.
residenceRouter.get(
  "/incoming",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  validateQuery(listResidencesQuerySchema),
  asyncHandler(residenceController.listIncoming),
);

/* -------------------------------------------------------------- decisions -- */

// Two routes rather than one with a status in the body, which is how the
// inspection module does it. The asymmetry is the reason: confirming takes no
// body at all, and rejecting REQUIRES words the claimant will read. As two
// schemas that rule is structural; as one it would be a `superRefine` that has to
// remember which status needs which field.
residenceRouter.post(
  "/:id/confirm",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  validateParams(residenceIdParamSchema),
  asyncHandler(residenceController.confirm),
);

residenceRouter.post(
  "/:id/reject",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  validateParams(residenceIdParamSchema),
  validateBody(rejectResidenceSchema),
  asyncHandler(residenceController.reject),
);

// Withdrawing is the claimant's, not the owner's — an owner rejects. Scoped to
// `userId: actor.id` in the service, so no role gate would add anything, and
// limited there to claims nobody has decided on yet.
residenceRouter.delete(
  "/:id",
  requireAuth,
  validateParams(residenceIdParamSchema),
  asyncHandler(residenceController.withdraw),
);
