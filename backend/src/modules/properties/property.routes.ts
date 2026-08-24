import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import * as propertyController from "./property.controller";
import {
  createPropertySchema,
  listMyPropertiesQuerySchema,
  listPropertiesQuerySchema,
  propertyIdParamSchema,
  propertyStatusSchema,
  reviewQueueQuerySchema,
  updatePropertySchema,
} from "./property.schemas";

/**
 * Property routes, mounted at /api/v1/properties.
 *
 * Reads are public; every write requires a session and a role, enforced here on
 * the server regardless of what the frontend chooses to show. Ownership is a
 * second, separate check inside the service — a landlord holding the right role
 * still cannot touch another landlord's listing.
 *
 * Who may create: LANDLORD (their own places), LAWYER (on a landlord's behalf,
 * which the lawyer upload form does), ADMIN. A TENANT cannot — the tenant
 * "upload apartment" flow is a move-out notice, not a listing, and belongs to
 * the mover domain.
 *
 * ROUTE ORDER MATTERS. `/mine` and `/review-queue` are declared before `/:id`,
 * or Express would read them as property ids and every owner or admin request
 * would 404.
 */
export const propertyRouter = Router();

/* --------------------------------------------------------- public reads -- */

propertyRouter.get(
  "/",
  validateQuery(listPropertiesQuerySchema),
  asyncHandler(propertyController.list),
);

/* ------------------------------------------------------ the caller's own -- */

propertyRouter.get(
  "/mine",
  requireAuth,
  validateQuery(listMyPropertiesQuerySchema),
  asyncHandler(propertyController.listMine),
);

propertyRouter.get(
  "/mine/:id",
  requireAuth,
  validateParams(propertyIdParamSchema),
  asyncHandler(propertyController.getMineById),
);

/* --------------------------------------------------------------- review -- */

// What is waiting to be decided. Admin only, and separate from `/mine`, which
// stays scoped to the caller even for an admin.
propertyRouter.get(
  "/review-queue",
  requireAuth,
  requireRole("ADMIN"),
  validateQuery(reviewQueueQuerySchema),
  asyncHandler(propertyController.reviewQueue),
);

// Status history for one listing. Readable by an admin and by the listing's own
// owner; the service decides which, and a stranger gets 404.
propertyRouter.get(
  "/:id/history",
  requireAuth,
  validateParams(propertyIdParamSchema),
  asyncHandler(propertyController.history),
);

/* ---------------------------------------------------------------- writes -- */

propertyRouter.post(
  "/",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  validateBody(createPropertySchema),
  asyncHandler(propertyController.create),
);

propertyRouter.patch(
  "/:id",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  validateParams(propertyIdParamSchema),
  validateBody(updatePropertySchema),
  asyncHandler(propertyController.update),
);

propertyRouter.delete(
  "/:id",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  validateParams(propertyIdParamSchema),
  asyncHandler(propertyController.remove),
);

propertyRouter.post(
  "/:id/submit",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  validateParams(propertyIdParamSchema),
  asyncHandler(propertyController.submit),
);

// The only route that can grant a verified badge — admin only.
propertyRouter.patch(
  "/:id/status",
  requireAuth,
  requireRole("ADMIN"),
  validateParams(propertyIdParamSchema),
  validateBody(propertyStatusSchema),
  asyncHandler(propertyController.setStatus),
);

/* ----------------------------------------------------- public detail read -- */
// Last: a bare `/:id` would otherwise swallow every path above it.

propertyRouter.get(
  "/:id",
  validateParams(propertyIdParamSchema),
  asyncHandler(propertyController.getById),
);
