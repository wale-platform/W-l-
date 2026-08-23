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
 * ROUTE ORDER MATTERS. `/mine` is declared before `/:id`, or Express would read
 * "mine" as a property id and every owner request would 404.
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
