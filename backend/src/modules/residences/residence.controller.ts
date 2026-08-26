import type { Request, Response } from "express";

import { UnauthorizedError } from "../../lib/errors";
import { sendCreated, sendSuccess } from "../../lib/http";
import type { ListResidencesQuery, RejectResidenceInput } from "./residence.schemas";
import * as residenceService from "./residence.service";

/**
 * Residence controllers.
 *
 * Every handler passes `req.user` straight through as the actor. No handler
 * decides for itself whether the caller may see or decide on a claim — that
 * belongs to the service, where it is part of the query. See
 * residence.service.ts.
 */

/** The authenticated caller, with the full role union. */
function actor(req: Request): residenceService.Actor {
  if (!req.user) throw new UnauthorizedError();
  return { id: req.user.id, roles: req.user.roles };
}

export async function claim(req: Request, res: Response): Promise<void> {
  const residence = await residenceService.claimResidence(actor(req), req.body);
  sendCreated(res, residence);
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListResidencesQuery;
  const result = await residenceService.listMyResidences(actor(req), query);
  sendSuccess(res, result);
}

export async function listIncoming(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListResidencesQuery;
  const result = await residenceService.listIncomingResidences(actor(req), query);
  sendSuccess(res, result);
}

export async function confirm(req: Request, res: Response): Promise<void> {
  const residence = await residenceService.confirmResidence(actor(req), req.params.id as string);
  sendSuccess(res, residence);
}

export async function reject(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as RejectResidenceInput;
  const residence = await residenceService.rejectResidence(
    actor(req),
    req.params.id as string,
    reason,
  );
  sendSuccess(res, residence);
}

/**
 * Withdrawing an undecided claim.
 *
 * `{ withdrawn: true }` rather than a 204, so the frontend's response envelope
 * unwrapping has something to unwrap — every other endpoint here returns data,
 * and a lone empty body would need a special case in the client for no benefit.
 */
export async function withdraw(req: Request, res: Response): Promise<void> {
  await residenceService.withdrawResidence(actor(req), req.params.id as string);
  sendSuccess(res, { withdrawn: true });
}
