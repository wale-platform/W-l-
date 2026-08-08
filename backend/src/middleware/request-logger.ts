import { randomUUID } from "node:crypto";

import { pinoHttp } from "pino-http";

import { logger } from "../lib/logger";

/**
 * HTTP request logging.
 *
 * Attaches a child logger to every request (`req.log`) with a correlation id,
 * and emits one structured line per completed request. Health checks are logged
 * at `debug` so routine liveness polling doesn't flood the logs.
 */
export const httpLogger = pinoHttp({
  logger,
  genReqId: (req, res) => {
    const existing = req.headers["x-request-id"];
    const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    if (req.url === "/api/v1/health" || req.url === "/health") return "debug";
    return "info";
  },
  // Keep request logs lean: method/url/status plus the correlation id.
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
});
