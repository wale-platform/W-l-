import { PrismaClient } from "@prisma/client";

import { isProd, isTest } from "../config/env";
import { logger } from "./logger";

/**
 * Prisma client singleton.
 *
 * A single PrismaClient is shared process-wide. In development, `tsx watch`
 * reloads modules on change; without caching the instance on `globalThis`
 * every reload would open a new connection pool and eventually exhaust the
 * database's connection limit. Production instantiates exactly once.
 */

const createPrismaClient = () =>
  new PrismaClient({
    log: isProd
      ? [{ emit: "event", level: "error" }]
      : isTest
        ? []
        : [
            { emit: "event", level: "error" },
            { emit: "event", level: "warn" },
          ],
  });

type PrismaSingleton = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaSingleton;
};

export const prisma: PrismaSingleton = globalForPrisma.prisma ?? createPrismaClient();

// Surface Prisma's own error/warn events through our structured logger.
prisma.$on("error", (e) => logger.error({ prisma: e }, "prisma error"));
if (!isProd && !isTest) {
  prisma.$on("warn", (e) => logger.warn({ prisma: e }, "prisma warning"));
}

if (!isProd) {
  globalForPrisma.prisma = prisma;
}
