import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import * as inspectionController from "./inspection.controller";
import {
  createInspectionSchema,
  inspectionIdParamSchema,
  listInspectionsQuerySchema,
  respondToInspectionSchema,
} from "./inspection.schemas";

/**
 * Inspection routes, mounted at /api/v1/inspections.
 *
 * Nothing here is public. A viewing request is a named person asking to be
 * somewhere at a time, so every route needs a session — and each one is scoped
 * further inside the service, which is what stops a landlord answering another
 * landlord's requests.
 *
 * Who may ask: TENANT, MOVER, and ADMIN. A mover is someone moving between
 * places, so they need this at least as much as a tenant does; LAWYER is left
 * out because a lawyer acts on a landlord's behalf on this platform, and
 * LANDLORD is left out because the request would land in their own queue. A
 * landlord who is also house-hunting holds the TENANT role too — that is what
 * the multi-role model is for.
 *
 * Who may answer: LANDLORD, LAWYER (acting for a landlord, as with listings),
 * ADMIN. Ownership is still checked in the service, so the role alone gets you
 * nothing.
 *
 * ROUTE ORDER: the literal-prefixed paths are declared before the `:id` ones.
 * They cannot actually collide here — every `:id` route carries a suffix — but
 * relying on that is the kind of thing a later edit breaks silently.
 */
export const inspectionRouter = Router();

/* ----------------------------------------------------------- the tenant's -- */

// Asking to view a listing. Property-scoped, because the listing is what is
// being acted on and its status decides whether a request is possible at all.
inspectionRouter.post(
  "/properties/:id",
  requireAuth,
  requireRole("TENANT", "MOVER", "ADMIN"),
  validateParams(inspectionIdParamSchema),
  validateBody(createInspectionSchema),
  asyncHandler(inspectionController.request),
);

// What the listing page's button needs to know: have I already asked?
inspectionRouter.get(
  "/properties/:id/mine",
  requireAuth,
  validateParams(inspectionIdParamSchema),
  asyncHandler(inspectionController.mineForProperty),
);

// The caller's own requests. No role gate: anyone who can hold a session can
// have asked to view something, and the query is scoped to them regardless.
inspectionRouter.get(
  "/mine",
  requireAuth,
  validateQuery(listInspectionsQuerySchema),
  asyncHandler(inspectionController.listMine),
);

/* --------------------------------------------------------- the landlord's -- */

// Requests on the caller's own listings — every listing's, for an admin.
inspectionRouter.get(
  "/incoming",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  validateQuery(listInspectionsQuerySchema),
  asyncHandler(inspectionController.listIncoming),
);

/* ------------------------------------------------------------- decisions -- */

inspectionRouter.patch(
  "/:id/respond",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  validateParams(inspectionIdParamSchema),
  validateBody(respondToInspectionSchema),
  asyncHandler(inspectionController.respond),
);

// Cancelling is the tenant's, not the landlord's — a landlord declines. Scoped
// to `tenantId: actor.id` in the service, so no role gate would add anything.
inspectionRouter.post(
  "/:id/cancel",
  requireAuth,
  validateParams(inspectionIdParamSchema),
  asyncHandler(inspectionController.cancel),
);
