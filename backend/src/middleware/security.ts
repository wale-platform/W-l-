import cors from "cors";
import type { CorsOptions } from "cors";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";

import { corsOrigins, env, isProd } from "../config/env";
import { ForbiddenError, TooManyRequestsError } from "../lib/errors";
import { sendError } from "../lib/http";

/**
 * Security middleware: transport hardening, a credentialed CORS allowlist, and
 * rate limiting. Assembled here and mounted by app.ts in order.
 */

// Sensible header hardening. This is a JSON API (no HTML), so the default CSP
// is unnecessary and only complicates local tooling.
export const securityHeaders = helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "same-site" },
});

// Credentialed CORS: the browser sends the session cookie, so we must reflect a
// specific allowlisted origin (never "*") and enable credentials. Requests with
// no Origin (curl, server-to-server, health checks) are allowed through.
const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new ForbiddenError(`Origin not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
  maxAge: 600,
};

export const corsMiddleware = cors(corsOptions);

// Global limiter — a coarse backstop against abuse across the whole API.
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (_req, res) => {
    const e = new TooManyRequestsError();
    sendError(res, e.statusCode, e.code, e.message);
  },
});

// Stricter limiter for authentication endpoints — throttles credential
// stuffing and brute-force attempts. Mounted on /auth in the auth router.
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  // Count only failed attempts; a successful login/register won't burn quota.
  skipSuccessfulRequests: true,
  handler: (_req, res) => {
    const e = new TooManyRequestsError(
      "Too many authentication attempts. Please try again later.",
    );
    sendError(res, e.statusCode, e.code, e.message);
  },
});

/** Trust the first proxy hop in production so client IPs / secure cookies work. */
export const trustProxy = isProd ? 1 : false;
