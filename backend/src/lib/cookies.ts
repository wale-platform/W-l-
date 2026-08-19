import type { CookieOptions, Response } from "express";

import { env } from "../config/env";

/**
 * Cookie helpers — one place that owns every cookie attribute so session and
 * CSRF cookies stay consistent and correctly scoped.
 *
 * Session cookie: httpOnly (JS cannot read it), Secure in production, SameSite
 * from config. It holds the RAW opaque session token; only its hash is stored
 * server-side.
 *
 * CSRF cookie: deliberately NOT httpOnly — the double-submit pattern requires
 * the frontend to read it and echo the value in the X-CSRF-Token header.
 */

export const SESSION_TTL_MS = env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

function baseCookieOptions(): CookieOptions {
  return {
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    domain: env.COOKIE_DOMAIN,
    path: "/",
  };
}

export function setSessionCookie(res: Response, rawToken: string, expiresAt: Date): void {
  res.cookie(env.SESSION_COOKIE_NAME, rawToken, {
    ...baseCookieOptions(),
    httpOnly: true,
    expires: expiresAt,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(env.SESSION_COOKIE_NAME, {
    ...baseCookieOptions(),
    httpOnly: true,
  });
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(env.CSRF_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    httpOnly: false, // must be readable by the frontend for double-submit
    // Session-lifetime cookie (no `expires`) — reissued as needed.
  });
}

export function readSessionCookie(cookies: Record<string, string | undefined>): string | undefined {
  return cookies[env.SESSION_COOKIE_NAME];
}

export function readCsrfCookie(cookies: Record<string, string | undefined>): string | undefined {
  return cookies[env.CSRF_COOKIE_NAME];
}
