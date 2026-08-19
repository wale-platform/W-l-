import "./types/express.d";

import cookieParser from "cookie-parser";
import express, { type Application } from "express";

import { csrfProtection } from "./middleware/csrf";
import { errorHandler, notFoundHandler } from "./middleware/error";
import { httpLogger } from "./middleware/request-logger";
import {
  corsMiddleware,
  globalRateLimiter,
  securityHeaders,
  trustProxy,
} from "./middleware/security";
import { apiV1Router } from "./routes";

/**
 * Express application assembly.
 *
 * Middleware order is deliberate:
 *   1. trust proxy         — correct client IPs / secure cookies behind a proxy
 *   2. security headers     — helmet, before anything responds
 *   3. request logging      — correlation id on every request from the start
 *   4. CORS                 — evaluate cross-origin before heavier work
 *   5. body / cookie parse  — make req.body / req.cookies available
 *   6. rate limiting        — throttle before hitting controllers/DB
 *   7. CSRF                 — guard unsafe methods once cookies are parsed
 *   8. routes               — the API surface under /api/v1
 *   9. 404 + error handler  — must be last
 *
 * Exported separately from the HTTP server so tests can drive it with supertest
 * without binding a port.
 */
export function createApp(): Application {
  const app = express();

  app.set("trust proxy", trustProxy);
  app.disable("x-powered-by");

  app.use(securityHeaders);
  app.use(httpLogger);
  app.use(corsMiddleware);
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(cookieParser());
  app.use(globalRateLimiter);
  app.use(csrfProtection);

  app.use("/api/v1", apiV1Router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
