import type { NextFunction, Request, Response } from "express";

import { readSessionCookie } from "../lib/cookies";
import { ForbiddenError, UnauthorizedError } from "../lib/errors";
import { toPublicUser } from "../modules/users/user.serializer";
import { validateSession } from "../modules/auth/session.service";
import type { Role } from "@prisma/client";

/**
 * Authentication & authorization middleware.
 *
 * `requireAuth` resolves the httpOnly session cookie to a user and rejects with
 * 401 if absent/invalid. `optionalAuth` attaches the user when present but never
 * blocks. `requireRole` gates a route to specific roles (401 if unauthenticated,
 * 403 if authenticated but not permitted).
 */

async function resolveUser(req: Request): Promise<boolean> {
  const rawToken = readSessionCookie(req.cookies ?? {});
  if (!rawToken) return false;

  const result = await validateSession(rawToken);
  if (!result) return false;

  req.user = toPublicUser(result.user);
  req.sessionId = result.session.id;
  return true;
}

export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ok = await resolveUser(req);
    if (!ok) {
      throw new UnauthorizedError("You must be signed in to do that");
    }
    next();
  } catch (err) {
    next(err);
  }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await resolveUser(req);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Gate a route to specific roles: 401 if unauthenticated, 403 if authenticated
 * but not permitted.
 *
 * Checks the user's FULL role set, not their primary role — an account whose
 * primary role is TENANT but which also holds LANDLORD must be able to reach
 * landlord routes. See src/modules/users/role.service.ts.
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError("You must be signed in to do that"));
      return;
    }
    if (!req.user.roles.some((held) => roles.includes(held))) {
      next(new ForbiddenError());
      return;
    }
    next();
  };
}
