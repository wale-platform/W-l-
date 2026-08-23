import type { Request, Response } from "express";

import { NotFoundError, UnauthorizedError } from "../../lib/errors";
import { sendCreated, sendSuccess } from "../../lib/http";
import type {
  ListMyPropertiesQuery,
  ListPropertiesQuery,
  PropertyStatusInput,
} from "./property.schemas";
import * as propertyService from "./property.service";

/**
 * Property controllers. The list/detail payloads are sent unwrapped inside the
 * standard `data` envelope; the frontend parses `data` against its
 * propertyListResponseSchema / propertySchema.
 *
 * Every owner-scoped handler passes `req.user` straight through as the actor —
 * no handler decides for itself whether the caller may touch a listing. That
 * decision belongs to the service, where it is part of the query.
 */

/** The authenticated caller, with the full role union. */
function actor(req: Request): propertyService.Actor {
  if (!req.user) throw new UnauthorizedError();
  return { id: req.user.id, roles: req.user.roles };
}

export async function list(req: Request, res: Response): Promise<void> {
  // Populated by validateQuery(listPropertiesQuerySchema).
  const query = req.validatedQuery as ListPropertiesQuery;
  const result = await propertyService.listProperties(query);
  sendSuccess(res, result);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const property = await propertyService.getPropertyById(req.params.id as string);
  if (!property) {
    throw new NotFoundError("Property not found");
  }
  sendSuccess(res, property);
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListMyPropertiesQuery;
  const result = await propertyService.listOwnedProperties(actor(req), query);
  sendSuccess(res, result);
}

export async function getMineById(req: Request, res: Response): Promise<void> {
  const property = await propertyService.getOwnedProperty(actor(req), req.params.id as string);
  sendSuccess(res, property);
}

export async function create(req: Request, res: Response): Promise<void> {
  const property = await propertyService.createProperty(actor(req), req.body);
  sendCreated(res, property);
}

export async function update(req: Request, res: Response): Promise<void> {
  const property = await propertyService.updateProperty(
    actor(req),
    req.params.id as string,
    req.body,
  );
  sendSuccess(res, property);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await propertyService.deleteProperty(actor(req), req.params.id as string);
  sendSuccess(res, { deleted: true });
}

export async function submit(req: Request, res: Response): Promise<void> {
  const property = await propertyService.submitForVerification(
    actor(req),
    req.params.id as string,
  );
  sendSuccess(res, property);
}

export async function setStatus(req: Request, res: Response): Promise<void> {
  const { status } = req.body as PropertyStatusInput;
  const property = await propertyService.setPropertyStatus(req.params.id as string, status);
  sendSuccess(res, property);
}
