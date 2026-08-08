import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { validateParams, validateQuery } from "../../middleware/validate";
import * as propertyController from "./property.controller";
import { listPropertiesQuerySchema, propertyIdParamSchema } from "./property.schemas";

/**
 * Property routes, mounted at /api/v1/properties. Read-only in this phase —
 * create/update/verify flows arrive with the landlord & verification modules.
 */
export const propertyRouter = Router();

propertyRouter.get(
  "/",
  validateQuery(listPropertiesQuerySchema),
  asyncHandler(propertyController.list),
);

propertyRouter.get(
  "/:id",
  validateParams(propertyIdParamSchema),
  asyncHandler(propertyController.getById),
);
