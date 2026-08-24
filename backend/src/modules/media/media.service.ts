import {
  cloudinaryConfig,
  createUploadTicket,
  missingCloudinaryVars,
  type UploadTicket,
} from "../../lib/cloudinary";
import { ServiceUnavailableError } from "../../lib/errors";
import { logger } from "../../lib/logger";

/**
 * Media service: issues upload tickets.
 *
 * There is no "store the file" function here on purpose. The browser uploads
 * directly to Cloudinary, so the only thing this server does is decide whether
 * an upload is allowed and sign it.
 */

/**
 * A ticket to upload one listing photo, scoped to `userId`.
 *
 * Throws 503 rather than 500 when media is not configured: the request was
 * perfectly valid and nothing the caller sent is wrong, so the honest answer is
 * "this is unavailable" — which is also a state the frontend can present as
 * "add photos later" instead of "something went wrong".
 *
 * The missing variable names go to the log, never to the response. An operator
 * needs to know which one; a visitor learning our configuration does not help
 * them and does help an attacker.
 */
export function createPropertyImageTicket(userId: string): UploadTicket {
  const config = cloudinaryConfig();

  if (!config) {
    logger.warn(
      { missing: missingCloudinaryVars() },
      "Upload signature requested but Cloudinary is not configured",
    );
    throw new ServiceUnavailableError(
      "Photo uploads are unavailable right now. You can save the listing and add photos later.",
    );
  }

  const ticket = createUploadTicket(userId, config);

  // The public id, not the signature: enough to find the asset later (orphan
  // cleanup, an abuse report) without writing a credential to the log.
  logger.info({ userId, publicId: ticket.publicId }, "Issued image upload signature");

  return ticket;
}
