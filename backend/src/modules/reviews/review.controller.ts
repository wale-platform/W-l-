import type { Request, Response } from "express";

import { UnauthorizedError } from "../../lib/errors";
import { sendCreated, sendSuccess } from "../../lib/http";
import type {
  ListReportsQuery,
  ListReviewsQuery,
  ModerateReviewInput,
  ReportReviewInput,
} from "./review.schemas";
import * as reviewService from "./review.service";

/**
 * Review controllers.
 *
 * Each handler passes `req.user` through as the actor and lets the service decide
 * what that actor may see or change — authorization here is part of the query, not
 * a check in a handler. See review.service.ts.
 *
 * The two public reads take `viewerId` instead of an actor: they work signed out,
 * and the only thing a session changes about them is whether a review is marked as
 * the reader's own.
 */

function actor(req: Request): reviewService.Actor {
  if (!req.user) throw new UnauthorizedError();
  return { id: req.user.id, roles: req.user.roles };
}

/** The signed-in reader, or null. Populated by `optionalAuth`, which never blocks. */
function viewerId(req: Request): string | null {
  return req.user?.id ?? null;
}

export async function create(req: Request, res: Response): Promise<void> {
  const review = await reviewService.createReview(
    actor(req),
    req.params.id as string,
    req.body,
  );
  sendCreated(res, review);
}

export async function update(req: Request, res: Response): Promise<void> {
  const review = await reviewService.updateReview(actor(req), req.params.id as string, req.body);
  sendSuccess(res, review);
}

export async function listForProperty(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListReviewsQuery;
  const result = await reviewService.listPropertyReviews(
    req.params.id as string,
    query,
    viewerId(req),
  );
  sendSuccess(res, result);
}

export async function summary(req: Request, res: Response): Promise<void> {
  const result = await reviewService.experienceSummary(req.params.id as string);
  sendSuccess(res, result);
}

export async function listMine(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListReviewsQuery;
  const result = await reviewService.listMyReviews(actor(req), query);
  sendSuccess(res, result);
}

/**
 * Reporting a review.
 *
 * `{ reported: true }` and nothing else. The reporter learns only that the
 * complaint landed — not the review's status, which reporting does not change, and
 * not what an admin subsequently does with it.
 */
export async function report(req: Request, res: Response): Promise<void> {
  const { reason } = req.body as ReportReviewInput;
  const result = await reviewService.reportReview(actor(req), req.params.id as string, reason);
  sendCreated(res, result);
}

export async function listReported(req: Request, res: Response): Promise<void> {
  const query = req.validatedQuery as ListReportsQuery;
  const result = await reviewService.listReportedReviews(actor(req), query);
  sendSuccess(res, result);
}

export async function moderate(req: Request, res: Response): Promise<void> {
  const result = await reviewService.moderateReview(
    actor(req),
    req.params.id as string,
    req.body as ModerateReviewInput,
  );
  sendSuccess(res, result);
}
