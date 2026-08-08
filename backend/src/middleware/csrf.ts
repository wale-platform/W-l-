import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { generateToken, safeEqual } from "../lib/crypto";
import { readCsrfCookie, setCsrfCookie } from "../lib/cookies";
import { ForbiddenError } from "../lib/errors";
import { sendSuccess } from "../lib/http";

/**
 * CSRF protection — stateless double-submit token.
 *
 * Because auth rides on a cookie the browser attaches automatically, a
 * malicious site could trigger state-changing requests. Defense: the frontend
 * fetches a CSRF token (readable, non-httpOnly cookie) and echoes it in the
 * `X-CSRF-Token` header on every unsafe request. An attacker's page can neither
 * read our cookie (same-origin policy) nor set a custom cross-origin header
 * without a CORS preflight we don't grant — so header==cookie proves same-origin
 * intent. No server-side storage required.
 *
 * Safe methods (GET/HEAD/OPTIONS) pass through untouched.
 */

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const CSRF_HEADER = "x-csrf-token";

/** GET /auth/csrf — issue a token, set the readable cookie, return it in body. */
export function issueCsrfToken(_req: Request, res: Response): void {
  const { raw } = generateToken(24);
  setCsrfCookie(res, raw);
  sendSuccess(res, { csrfToken: raw });
}

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (!env.CSRF_ENABLED || SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookieToken = readCsrfCookie(req.cookies ?? {});
  const headerValue = req.get(CSRF_HEADER);
  const headerToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
    next(new ForbiddenError("Invalid or missing CSRF token"));
    return;
  }

  next();
}
