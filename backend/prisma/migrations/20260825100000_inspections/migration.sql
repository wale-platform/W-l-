-- Inspection requests.
--
-- The one action a listing page needs beyond reading it: a tenant asking to see
-- the place in person, dated and attributable, with the landlord's answer
-- recorded next to it.
--
-- Written by hand rather than generated, because the uniqueness rule that makes
-- this table safe is a PARTIAL index and Prisma's schema language cannot express
-- one. See the bottom of this file.

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED', 'CANCELLED', 'COMPLETED');

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "InspectionStatus" NOT NULL DEFAULT 'REQUESTED',
    "preferredAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT,
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: the landlord's queue for one listing, and the count of live
-- requests shown on their dashboard.
CREATE INDEX "Inspection_propertyId_status_idx" ON "Inspection"("propertyId", "status");

-- CreateIndex: the tenant's own list, newest ask first.
CREATE INDEX "Inspection_tenantId_createdAt_idx" ON "Inspection"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- One LIVE request per tenant per property.
--
-- Partial, on status = 'REQUESTED' alone, which is the whole reason this is
-- hand-written: a plain unique index on (propertyId, tenantId) would mean a
-- tenant whose viewing was declined could never ask again, and a tenant who saw
-- one flat in September could not come back in January. Only an unanswered
-- request is the duplicate worth refusing.
--
-- In the database rather than as a check-then-insert in the service, because
-- two taps on a slow connection race past application-level checks: both read
-- "no existing request", both insert, and the landlord gets the same ask twice.
-- Postgres refuses the second write no matter how the requests interleave. The
-- service catches P2002 and turns it into a plain-language 409.
CREATE UNIQUE INDEX "Inspection_one_live_request_per_tenant_per_property"
    ON "Inspection"("propertyId", "tenantId")
    WHERE "status" = 'REQUESTED';
