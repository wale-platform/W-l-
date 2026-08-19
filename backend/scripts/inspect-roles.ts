import { PrismaClient } from "@prisma/client";

/**
 * Read-only inspection of role state, used to verify the roles migration
 * preserved existing data rather than recreating the enum. Safe to run anytime.
 *   npx tsx scripts/inspect-roles.ts
 */
async function main(): Promise<void> {
  const p = new PrismaClient();
  try {
    const roles = await p.$queryRawUnsafe<{ role: string; n: number }[]>(
      `SELECT "role"::text AS role, count(*)::int AS n FROM "User" GROUP BY 1 ORDER BY 1`,
    );
    console.log("User.role distribution:", JSON.stringify(roles));
    console.log("total users:", roles.reduce((s, r) => s + r.n, 0));

    const enumVals = await p.$queryRawUnsafe<{ v: string }[]>(
      `SELECT e.enumlabel AS v FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'Role' ORDER BY e.enumsortorder`,
    );
    console.log("Role enum values:", enumVals.map((r) => r.v).join(", "));

    const exists = await p.$queryRawUnsafe<{ exists: boolean }[]>(
      `SELECT EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_name = 'UserRole') AS exists`,
    );
    console.log("UserRole table exists:", exists[0]?.exists);
    if (exists[0]?.exists) {
      const ur = await p.$queryRawUnsafe<{ role: string; n: number }[]>(
        `SELECT "role"::text AS role, count(*)::int AS n FROM "UserRole" GROUP BY 1 ORDER BY 1`,
      );
      console.log("UserRole distribution:", JSON.stringify(ur));
    }
  } finally {
    await p.$disconnect();
  }
}

void main();
