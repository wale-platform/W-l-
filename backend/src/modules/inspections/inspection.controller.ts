import type { Request, Response } from "express";

import { UnauthorizedError } from "../../lib/errors";
import { sendCreated, sendSuccess } from "../../lib/http";
import type { ListInspectionsQuery, RespondToInspectionInput } from "./inspection.schemas";
import * as inspectionService from "./inspection.service";

/**
 * Inspection controllers.
 *
 * Every handler passes `req.user` straight through as the actor. No handler
 * decides for itself whether the caller may see or answer a request — that
 * belongs to the service, where it is part of the query. See
 * inspection.service.ts.
 */

/** The authenticated caller, with the full role union. */
function actor(req: Request): inspectionService.Actor {
  if (!req.user) throw new UnauthorizedError();
  return { id: req.user.id, roles: req.user.roles };
}

export async function request(req: Request, res: Response): Promise<void> {
  const inspection = await inspectionService.requestInspection(
    actor(req),
    req.params.id as string,
    req.body,
  );
  sendCreated(res, inspection);
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListInspectionsQuery;
  const result = await inspectionService.listMyInspections(actor(req), query);
  sendSuccess(res, result);
}

export async function listIncoming(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListInspectionsQuery;
  const result = await inspectionService.listIncomingInspections(actor(req), query);
  sendSuccess(res, result);
}

export async function respond(req: Request, res: Response): Promise<void> {
  const inspection = await inspectionService.respondToInspection(
    actor(req),
    req.params.id as string,
    req.body as RespondToInspectionInput,
  );
  sendSuccess(res, inspection);
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const inspection = await inspectionService.cancelInspection(actor(req), req.params.id as string);
  sendSuccess(res, inspection);
}

/**
 * Whether the caller already has a live request on one listing.
 *
 * Returns `{ inspection: null }` rather than a 404 when there is none: "you have
 * not asked to view this" is a successful answer to the question the listing
 * page is asking, not a missing resource.
 */
export async function mineForProperty(req: Request, res: Response): Promise<void> {
  const inspection = await inspectionService.getMyInspectionFor(
    actor(req),
    req.params.id as string,
  );
  sendSuccess(res, { inspection });
}
