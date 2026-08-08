import type { Server } from "node:http";

import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";

/**
 * HTTP server bootstrap + graceful shutdown.
 *
 * On SIGINT/SIGTERM we stop accepting new connections, let in-flight requests
 * drain, disconnect Prisma, then exit — so deploys and Ctrl-C don't sever live
 * requests or leak database connections.
 */

const app = createApp();

const server: Server = app.listen(env.PORT, () => {
  logger.info(
    { port: env.PORT, env: env.NODE_ENV },
    `Wale API listening on http://localhost:${env.PORT}/api/v1`,
  );
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "shutting down…");

  // Force-exit if a clean shutdown stalls (e.g. a hung keep-alive socket).
  const forceExit = setTimeout(() => {
    logger.error("forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
  forceExit.unref();

  server.close(async (err) => {
    if (err) {
      logger.error({ err }, "error during server close");
      process.exit(1);
    }
    await prisma.$disconnect().catch(() => undefined);
    logger.info("shutdown complete");
    process.exit(0);
  });
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "unhandled promise rejection");
});
process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception — exiting");
  process.exit(1);
});
