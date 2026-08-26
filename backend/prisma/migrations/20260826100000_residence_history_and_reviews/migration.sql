-- Residence history, lived-experience reviews, and review reports.
--
-- The mover domain: a person records that they lived somewhere, the property's
-- owner confirms or refuses it, and a confirmed period entitles them to one
-- review of what it was actually like to live there.
--
-- Purely additive. No existing table is altered and no row is touched — the
-- generated diff against the live database contained no DROP and no ALTER of an
-- existing relation, which is checked rather than assumed because this schema
-- runs against a shared database with real listings in it.
--
-- The statement bodies are Prisma's own generated diff. The CHECK constraints at
-- the bottom are added by hand: they are invariants Prisma's schema language
-- cannot express, and each one is guarding something the brief is explicit
-- about. See the note above each.

-- CreateEnum
CREATE TYPE "ResidenceStatus" AS ENUM ('UNVERIFIED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'REMOVED');

-- CreateTable
CREATE TABLE "ResidenceHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "status" "ResidenceStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "movedInAt" DATE NOT NULL,
    "movedOutAt" DATE,
    "note" TEXT,
    "corroboratedByInspectionId" TEXT,
    "confirmedById" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResidenceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyReview" (
    "id" TEXT NOT NULL,
    "residenceId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "overall" INTEGER NOT NULL,
    "water" INTEGER NOT NULL,
    "power" INTEGER NOT NULL,
    "security" INTEGER NOT NULL,
    "landlord" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewReport" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResidenceHistory_userId_createdAt_idx" ON "ResidenceHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ResidenceHistory_propertyId_status_idx" ON "ResidenceHistory"("propertyId", "status");

-- CreateIndex: the same person, the same property, the same move-in date is one
-- claim submitted twice. Scoped this way rather than to (userId, propertyId)
-- because living somewhere twice years apart is real, and each stay is its own
-- reviewable period.
CREATE UNIQUE INDEX "ResidenceHistory_userId_propertyId_movedInAt_key" ON "ResidenceHistory"("userId", "propertyId", "movedInAt");

-- CreateIndex: one review per residence period, in the database rather than as a
-- check-then-insert the second tap on a slow connection can race past.
CREATE UNIQUE INDEX "PropertyReview_residenceId_key" ON "PropertyReview"("residenceId");

-- CreateIndex
CREATE INDEX "PropertyReview_propertyId_status_createdAt_idx" ON "PropertyReview"("propertyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PropertyReview_authorId_idx" ON "PropertyReview"("authorId");

-- CreateIndex
CREATE INDEX "ReviewReport_resolvedAt_createdAt_idx" ON "ReviewReport"("resolvedAt", "createdAt");

-- CreateIndex: one report per person per review, so a landlord cannot manufacture
-- a pile of reports against a bad review by clicking repeatedly.
CREATE UNIQUE INDEX "ReviewReport_reviewId_reporterId_key" ON "ReviewReport"("reviewId", "reporterId");

-- AddForeignKey
ALTER TABLE "ResidenceHistory" ADD CONSTRAINT "ResidenceHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidenceHistory" ADD CONSTRAINT "ResidenceHistory_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidenceHistory" ADD CONSTRAINT "ResidenceHistory_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResidenceHistory" ADD CONSTRAINT "ResidenceHistory_corroboratedByInspectionId_fkey" FOREIGN KEY ("corroboratedByInspectionId") REFERENCES "Inspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReview" ADD CONSTRAINT "PropertyReview_residenceId_fkey" FOREIGN KEY ("residenceId") REFERENCES "ResidenceHistory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReview" ADD CONSTRAINT "PropertyReview_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyReview" ADD CONSTRAINT "PropertyReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "PropertyReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewReport" ADD CONSTRAINT "ReviewReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ────────────────────────────────────────── Invariants Prisma cannot express ──

-- Nobody verifies their own claim.
--
-- The service already refuses it, and the confirm query is scoped to the
-- property's owner so a claimant would have to own the property they claim to
-- have rented. This is here anyway because it is the single most important rule
-- in the domain: a confirmation is worth something only because the party who
-- gave it had an interest in refusing. If a future code path — an admin tool, a
-- backfill script, a bulk importer — ever tried to shortcut it, the database
-- refuses the write instead of quietly producing a self-verified residence.
ALTER TABLE "ResidenceHistory" ADD CONSTRAINT "ResidenceHistory_not_self_confirmed"
    CHECK ("confirmedById" IS NULL OR "confirmedById" <> "userId");

-- A tenancy cannot end before it starts.
--
-- Nothing sensible reads a period with the dates the wrong way round, and the
-- experience summary would report a negative stay length. Cheap to enforce here,
-- and impossible to violate later by accident.
ALTER TABLE "ResidenceHistory" ADD CONSTRAINT "ResidenceHistory_period_ordered"
    CHECK ("movedOutAt" IS NULL OR "movedOutAt" >= "movedInAt");

-- Ratings are 1-5, and the database says so.
--
-- The schemas validate this on the way in, but the averages on a property page
-- are computed by the database from these columns. A single 0 or 11 that got past
-- the application — through a script, a fixture, a manual fix — would silently
-- move a real property's public rating, which is the "do not invent ratings"
-- failure mode arriving by the back door. A rating column has no meaning outside
-- its scale, so the scale belongs in its definition.
ALTER TABLE "PropertyReview" ADD CONSTRAINT "PropertyReview_ratings_in_range"
    CHECK (
        "overall"  BETWEEN 1 AND 5 AND
        "water"    BETWEEN 1 AND 5 AND
        "power"    BETWEEN 1 AND 5 AND
        "security" BETWEEN 1 AND 5 AND
        "landlord" BETWEEN 1 AND 5
    );
