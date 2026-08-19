import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { validateBody, validateParams } from "../../middleware/validate";
import * as userController from "./user.controller";
import { claimRoleSchema, grantRoleSchema, roleParamSchema } from "./user.schemas";

/**
 * User routes, mounted at /api/v1/users.
 *
 * Authorization is enforced HERE, on the server, independent of whatever the
 * frontend chooses to show or hide. The admin grant endpoint is gated by
 * `requireRole("ADMIN")` so it is not reachable by a normal user at all.
 */
export const userRouter = Router();

// ── The caller's own roles ───────────────────────────────────────────────────
userRouter.get("/me/roles", requireAuth, asyncHandler(userController.myRoles));

userRouter.post(
  "/me/roles",
  requireAuth,
  validateBody(claimRoleSchema),
  asyncHandler(userController.claimMyRole),
);

userRouter.delete(
  "/me/roles/:role",
  requireAuth,
  validateParams(roleParamSchema),
  asyncHandler(userController.dropMyRole),
);

// ── Admin-only: grant any role to any user ───────────────────────────────────
userRouter.post(
  "/:id/roles",
  requireAuth,
  requireRole("ADMIN"),
  validateBody(grantRoleSchema),
  asyncHandler(userController.grantRole),
);
