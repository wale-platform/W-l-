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

/**
 * How long an interactive transaction may take, set once for every caller.
 *
 * Prisma's defaults (2s to get a connection, 5s to finish) assume the database
 * is next door. Ours is a hosted Postgres reached over the internet, where a
 * two-statement transaction is two round trips plus whatever the pool is busy
 * with — and a live run against Supabase hit `P2028: Transaction already
 * closed` on both registration and listing submission, one of them 12.6s in.
 *
 * That failure mode is the worst kind: the writes roll back, so nothing is
 * corrupted, but the user is shown a 500 for an operation that was fine. The
 * budget is raised rather than the transactions being unwound into separate
 * writes, because what each one guarantees is worth keeping — a user without
 * their role row, or a status change with no audit row, are exactly the states
 * these transactions exist to make impossible.
 *
 * Still bounded, and deliberately not enormous: a transaction holds a
 * connection and a row lock while it runs, so the ceiling is high enough to
 * absorb a slow link and low enough that a genuinely stuck query gives the
 * connection back instead of starving the pool.
 */
const TRANSACTION_OPTIONS = {
  /** Waiting for a free connection when the pool is saturated. */
  maxWait: 10_000,
  /** Running, once it has one. */
  timeout: 20_000,
} as const;

const createPrismaClient = () =>
  new PrismaClient({
    transactionOptions: TRANSACTION_OPTIONS,
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
