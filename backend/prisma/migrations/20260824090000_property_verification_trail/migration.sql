-- Verification audit trail.
--
-- Until now a status change left no record: a landlord staring at "Rejected" had
-- no way to learn what to fix, and nobody could answer "who took this listing
-- down, and when" after the fact. One append-only row per transition fixes both.
--
-- Written by hand so the backfill below ships WITH the table. The alternative is
-- a trail that begins today and silently implies the 12 existing listings were
-- never reviewed at all.

-- CreateTable
CREATE TABLE "PropertyVerification" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "fromStatus" "PropertyStatus" NOT NULL,
    "toStatus" "PropertyStatus" NOT NULL,
    "reason" TEXT,
    "actorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: the owner's "why was this rejected" query — newest row for one
-- listing.
CREATE INDEX "PropertyVerification_propertyId_createdAt_idx" ON "PropertyVerification"("propertyId", "createdAt");

-- CreateIndex: the admin counterpart — recent decisions across all listings.
CREATE INDEX "PropertyVerification_createdAt_idx" ON "PropertyVerification"("createdAt");

-- AddForeignKey: the trail describes a listing, so it goes when the listing goes.
ALTER TABLE "PropertyVerification" ADD CONSTRAINT "PropertyVerification_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: SET NULL, not CASCADE — deleting an admin's account must not
-- erase the decisions they made. What was decided outlives who decided it.
ALTER TABLE "PropertyVerification" ADD CONSTRAINT "PropertyVerification_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: one opening row per existing listing, recording the status it is
-- already in as though it had just arrived there.
--
-- `fromStatus` = DRAFT because every listing starts there; for a seeded VERIFIED
-- listing that is a compression of a history nobody recorded, not a claim that
-- the transition happened at `createdAt`. `actorId` is NULL (no admin is on
-- record) and `reason` says plainly that this is pre-existing state — so the
-- landlord-facing reason for a REJECTED listing can never be an invented one.
--
-- Skipped for rows already in DRAFT: there is no transition to describe.
INSERT INTO "PropertyVerification" ("id", "propertyId", "fromStatus", "toStatus", "reason", "actorId", "createdAt")
SELECT
    'seedver_' || p."id",
    p."id",
    'DRAFT'::"PropertyStatus",
    p."status",
    'Recorded when the audit trail was introduced; the original decision predates it.',
    NULL,
    p."createdAt"
FROM "Property" p
WHERE p."status" <> 'DRAFT'::"PropertyStatus";
