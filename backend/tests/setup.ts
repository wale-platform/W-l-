import { beforeEach, vi } from "vitest";
import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { PrismaClient } from "@prisma/client";

/**
 * Global test setup.
 *
 * 1. Establish a deterministic environment BEFORE any module reads it
 *    (src/config/env.ts validates process.env at import time).
 * 2. Replace the Prisma singleton with a deep mock so the suite runs without a
 *    live database. Every other layer — routing, middleware, controllers,
 *    services, Argon2 hashing, session/CSRF logic — runs for real.
 *
 * `vi.mock` is hoisted and, from a setup file, applies to all test files.
 */

process.env.NODE_ENV = "test";
process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/wale_test";
process.env.SESSION_SECRET ??= "test-session-secret-at-least-32-characters-long";
process.env.FRONTEND_URL ??= "http://localhost:3000";
process.env.CSRF_ENABLED ??= "true";
process.env.EMAIL_TRANSPORT ??= "log";
// Keep rate limits out of the way of the functional suite.
process.env.AUTH_RATE_LIMIT_MAX ??= "1000";
process.env.RATE_LIMIT_MAX ??= "100000";

vi.mock("../src/lib/prisma", () => ({
  prisma: mockDeep<PrismaClient>(),
}));

// Import AFTER the mock is registered so we grab the mocked instance.
import { prisma } from "../src/lib/prisma";

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);

  // Interactive transactions must actually run their callback, otherwise any
  // service using `prisma.$transaction` silently resolves to undefined. Passing
  // the mock itself as the transaction client means `tx.user.create(...)` and
  // `prisma.user.create(...)` are the same spy, so existing assertions hold.
  // The array form (`$transaction([...])`) is also supported for completeness.
  //
  // The cast is unavoidable: `$transaction` is heavily overloaded, and no single
  // signature covers both the callback and array forms.
  const runTransaction = (arg: unknown): Promise<unknown> =>
    typeof arg === "function"
      ? Promise.resolve((arg as (tx: typeof prismaMock) => unknown)(prismaMock))
      : Promise.all(arg as unknown[]);

  (
    prismaMock.$transaction as unknown as {
      mockImplementation: (fn: typeof runTransaction) => void;
    }
  ).mockImplementation(runTransaction);
});
