import { defineConfig } from "vitest/config";

/**
 * Test runner configuration.
 *
 * - `setup.ts` runs before the suite to establish a deterministic test
 *   environment (env vars, DB reset hooks).
 * - Tests run single-threaded (no parallel forks) because they share one
 *   Postgres test database; parallel writers would race.
 * - Integration tests hit a real database, so the timeout is generous.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20_000,
    hookTimeout: 30_000,
    include: ["tests/**/*.test.ts"],
  },
});
