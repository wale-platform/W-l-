import type { Request, Response } from "express";

import { UnauthorizedError } from "../../lib/errors";
import { sendSuccess } from "../../lib/http";
import { createPropertyImageTicket } from "./media.service";

/**
 * Media controller.
 *
 * One endpoint: hand the browser a signed permission slip so it can upload a
 * listing photo straight to Cloudinary.
 */

export async function uploadSignature(req: Request, res: Response): Promise<void> {
  // `requireAuth` guarantees this, but the folder the upload lands in is derived
  // from the id — so read it defensively rather than assert a non-null and have
  // a middleware reorder later turn into uploads landing in a folder called
  // "undefined".
  if (!req.user) {
    throw new UnauthorizedError("You must be signed in to upload a photo");
  }

  sendSuccess(res, createPropertyImageTicket(req.user.id));
}
