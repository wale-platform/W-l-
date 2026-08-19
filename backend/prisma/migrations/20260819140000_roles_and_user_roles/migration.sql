-- Roles: rename USER -> TENANT, add LAWYER and MOVER, and introduce UserRole so
-- one account can hold several roles.
--
-- Written by hand. `prisma migrate dev` wanted to DROP and recreate the "Role"
-- enum, which would have destroyed the role of every existing row (and would
-- have failed outright while any row still held 'USER'). Renaming the value in
-- place preserves the data: Postgres identifies enum values by OID, so every
-- existing 'USER' row simply reads as 'TENANT' afterwards.
--
-- ALTER TYPE ... ADD VALUE inside a transaction is safe on Postgres 12+ (Supabase
-- is well past that) as long as the newly added values are not referenced later
-- in the same transaction. Nothing below references LAWYER or MOVER, and the new
-- default 'TENANT' is a *renamed* pre-existing value, not a new one.

-- AlterEnum: preserve existing rows by renaming rather than recreating.
ALTER TYPE "Role" RENAME VALUE 'USER' TO 'TENANT';
ALTER TYPE "Role" ADD VALUE 'LAWYER';
ALTER TYPE "Role" ADD VALUE 'MOVER';

-- AlterTable: the column default followed the old value name.
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'TENANT';

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedByUserId" TEXT,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","role")
);

-- CreateIndex
CREATE INDEX "UserRole_role_idx" ON "UserRole"("role");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_grantedByUserId_fkey" FOREIGN KEY ("grantedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: mirror every existing account's primary role into UserRole so the
-- union query (primary role + granted roles) is consistent for rows that
-- predate this table. Idempotent via ON CONFLICT.
INSERT INTO "UserRole" ("userId", "role", "grantedAt")
SELECT "id", "role", "createdAt" FROM "User"
ON CONFLICT ("userId", "role") DO NOTHING;
