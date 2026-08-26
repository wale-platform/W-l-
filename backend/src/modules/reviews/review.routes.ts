import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { optionalAuth, requireAuth, requireRole } from "../../middleware/auth";
import { validateBody, validateParams, validateQuery } from "../../middleware/validate";
import { propertyIdParamSchema } from "../properties/property.schemas";
import * as reviewController from "./review.controller";
import {
  createReviewSchema,
  listReportsQuerySchema,
  listReviewsQuerySchema,
  moderateReviewSchema,
  reportReviewSchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from "./review.schemas";

/**
 * Review routes, in two routers because reviews live at two different addresses.
 *
 * `propertyReviewRouter` is mounted at /api/v1/properties and holds the reads and
 * the write that belong to a listing: a review is always OF a property, so
 * `/properties/:id/reviews` is where it is created and read. `reviewRouter` is
 * mounted at /api/v1/reviews and holds everything addressed by the review's own id.
 *
 * ADMIN ROUTES ARE NOT UNDER /admin. `GET /reviews/reported` and
 * `PATCH /reviews/:id/moderate` are role-gated in place, matching how the
 * verification workflow already shipped (`GET /properties/review-queue`,
 * `PATCH /properties/:id/status`). What keeps an admin API away from normal users
 * is `requireRole("ADMIN")`, not a path prefix, and one convention across the API is
 * worth more than a second one that only looks stricter.
 */

/* ------------------------------------------------- nested under a property -- */

export const propertyReviewRouter = Router();

/**
 * The listing page's review list. Public, but with `optionalAuth` so a signed-in
 * reader's own review can be marked as theirs — the only thing a session changes
 * about this response.
 */
propertyReviewRouter.get(
  "/:id/reviews",
  optionalAuth,
  validateParams(propertyIdParamSchema),
  validateQuery(listReviewsQuerySchema),
  asyncHandler(reviewController.listForProperty),
);

/**
 * The aggregate above that list. Public and session-blind: an average does not
 * change depending on who is looking.
 */
propertyReviewRouter.get(
  "/:id/experience-summary",
  validateParams(propertyIdParamSchema),
  asyncHandler(reviewController.summary),
);

/**
 * Writing a review.
 *
 * TENANT, MOVER, ADMIN — the same set that may claim a residence, because a review
 * requires a claim and a role that cannot claim could never satisfy the service
 * anyway. LANDLORD is absent for the same reason it is absent there: a landlord who
 * also rents holds the TENANT role.
 *
 * The role gate is the cheap check. The real one is in the service, which requires
 * a residence claim belonging to the caller and naming this same property.
 */
propertyReviewRouter.post(
  "/:id/reviews",
  requireAuth,
  requireRole("TENANT", "MOVER", "ADMIN"),
  validateParams(propertyIdParamSchema),
  validateBody(createReviewSchema),
  asyncHandler(reviewController.create),
);

/* ------------------------------------------- addressed by the review's id -- */

export const reviewRouter = Router();

// Literal paths before `/:id` ones, so `/reviews/mine` is never read as an id.
reviewRouter.get(
  "/mine",
  requireAuth,
  validateQuery(listReviewsQuerySchema),
  asyncHandler(reviewController.listMine),
);

// The admin queue of complaints. Role-gated here; also refused in the service.
reviewRouter.get(
  "/reported",
  requireAuth,
  requireRole("ADMIN"),
  validateQuery(listReportsQuerySchema),
  asyncHandler(reviewController.listReported),
);

// The author's own revision. No role gate — `authorId` is the whole rule, and it
// is a WHERE clause in the service.
reviewRouter.patch(
  "/:id",
  requireAuth,
  validateParams(reviewIdParamSchema),
  validateBody(updateReviewSchema),
  asyncHandler(reviewController.update),
);

/**
 * Reporting a review. Any signed-in account, deliberately: the person most likely
 * to spot a fake review of a flat is the landlord being reviewed, and the person
 * most likely to spot an abusive one is a reader.
 *
 * This route cannot hide a review. See review.service.ts — that is the design of
 * the endpoint, not an oversight in this gate.
 */
reviewRouter.post(
  "/:id/report",
  requireAuth,
  validateParams(reviewIdParamSchema),
  validateBody(reportReviewSchema),
  asyncHandler(reviewController.report),
);

// The only route that can change a review's visibility, and the only one an author
// cannot reach.
reviewRouter.patch(
  "/:id/moderate",
  requireAuth,
  requireRole("ADMIN"),
  validateParams(reviewIdParamSchema),
  validateBody(moderateReviewSchema),
  asyncHandler(reviewController.moderate),
);
