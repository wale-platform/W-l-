import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { requireAuth, requireRole } from "../../middleware/auth";
import { uploadRateLimiter } from "../../middleware/security";
import { validateBody } from "../../middleware/validate";
import * as mediaController from "./media.controller";
import { uploadSignatureSchema } from "./media.schemas";

/**
 * Media routes, mounted at /api/v1/media.
 *
 * The role gate matches who may create a listing (see property.routes.ts) — a
 * signature is permission to write to our Cloudinary account, so it is not
 * something every signed-in tenant should be able to ask for. When the mover
 * flow needs to upload proof of residence, that gets its own route with its own
 * gate rather than this one being widened; the two have different rules about
 * who may upload what.
 *
 * Rate limited more tightly than the API as a whole: each ticket is an
 * invitation to consume storage on our account, and unlike a read there is no
 * cache in front of it.
 */
export const mediaRouter = Router();

mediaRouter.post(
  "/upload-signature",
  requireAuth,
  requireRole("LANDLORD", "LAWYER", "ADMIN"),
  uploadRateLimiter,
  validateBody(uploadSignatureSchema),
  asyncHandler(mediaController.uploadSignature),
);
