import { Router } from "express";

import { asyncHandler } from "../../lib/async-handler";
import { sendSuccess } from "../../lib/http";
import { prisma } from "../../lib/prisma";

/**
 * Health checks.
 *
 * GET /health        — liveness: the process is up. Cheap, no dependencies.
 * GET /health/ready  — readiness: dependencies (database) are reachable.
 *                      Returns 503 if the DB round-trip fails, so an
 *                      orchestrator can withhold traffic until we're ready.
 */
export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  sendSuccess(res, { status: "ok", uptime: process.uptime() });
});

healthRouter.get(
  "/ready",
  asyncHandler(async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      sendSuccess(res, { status: "ready", database: "up" });
    } catch {
      res
        .status(503)
        .json({ success: false, error: { code: "NOT_READY", message: "Database unavailable" } });
    }
  }),
);
