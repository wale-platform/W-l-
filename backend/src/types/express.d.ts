import type { PublicUser } from "../modules/users/user.serializer";

/**
 * Ambient augmentation of Express's Request with the fields our middleware
 * attaches. Centralized here so every module sees the same typed contract.
 *
 * - `user`      — the authenticated user's safe DTO (set by requireAuth /
 *                 optionalAuth). Never carries passwordHash.
 * - `sessionId` — the current session's id, for "this device" awareness.
 * - `validatedQuery` — parsed query params (Express 5's req.query is read-only).
 */
declare global {
   
  namespace Express {
    interface Request {
      user?: PublicUser;
      sessionId?: string;
      validatedQuery?: unknown;
    }
  }
}

export {};
