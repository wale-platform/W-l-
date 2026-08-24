import { PrismaClient } from "@prisma/client";

/**
 * Remove the throwaway accounts the live contract checks leave behind, and print
 * the table counts either side so the shared database is verifiably back where it
 * started.
 *
 *   npx tsx scripts/clean-test-accounts.ts          # show what would go
 *   npx tsx scripts/clean-test-accounts.ts --delete # actually delete
 *
 * Scope is one narrow pattern: propcheck+…@wale.test and authcheck+…@wale.test,
 * the addresses those scripts generate. It cannot touch a seeded or real account,
 * which is the whole point of having it rather than typing DELETE at a prompt
 * against a database somebody else is also using.
 *
 * `Property.owner` is `onDelete: SetNull`, so a listing whose owner is deleted is
 * orphaned rather than removed. The seeded catalogue is ownerless by design, so
 * that count starts non-zero — what matters is that it does not GROW across a
 * run. If it does, a contract check died before deleting the listing it made,
 * and that listing is now in the public catalogue with no owner.
 */

const PATTERNS = [
  { startsWith: "propcheck+", endsWith: "@wale.test" },
  { startsWith: "authcheck+", endsWith: "@wale.test" },
];

async function counts(p: PrismaClient) {
  return {
    users: await p.user.count(),
    userRoles: await p.userRole.count(),
    properties: await p.property.count(),
    propertyImages: await p.propertyImage.count(),
    orphanProperties: await p.property.count({ where: { ownerId: null } }),
  };
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--delete");
  const p = new PrismaClient();
  try {
    const where = { OR: PATTERNS.map((email) => ({ email })) };

    const doomed = await p.user.findMany({ where, select: { email: true } });
    console.log("before:", await counts(p));
    console.log(`matched ${doomed.length}:`, doomed.map((u) => u.email).join(", ") || "(none)");

    if (!apply) {
      console.log("\nDry run. Re-run with --delete to remove them.");
      return;
    }

    const { count } = await p.user.deleteMany({ where });
    console.log(`deleted ${count}`);
    console.log("after: ", await counts(p));
  } finally {
    await p.$disconnect();
  }
}

void main();
