import type { Request, Response } from "express";

import { NotFoundError } from "../../lib/errors";
import { sendSuccess } from "../../lib/http";
import type { ListPropertiesQuery } from "./property.schemas";
import { getPropertyById, listProperties } from "./property.service";

/**
 * Property controllers. The list/detail payloads are sent unwrapped inside the
 * standard `data` envelope; the frontend parses `data` against its
 * propertyListResponseSchema / propertySchema.
 */

export async function list(req: Request, res: Response): Promise<void> {
  // Populated by validateQuery(listPropertiesQuerySchema).
  const query = req.validatedQuery as ListPropertiesQuery;
  const result = await listProperties(query);
  sendSuccess(res, result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const property = await getPropertyById(req.params.id as string);
  if (!property) {
    throw new NotFoundError("Property not found");
  }
  sendSuccess(res, property);
}
