-- Searchable amenity tags on Property.
--
-- `amenities` is free text and stays that way: it is what the landlord wrote and
-- what the listing shows. It cannot be filtered on, though — the catalogue today
-- contains "Estate security", "Security gate", "Security guard" and "CCTV", so a
-- checkbox matching by equality would return nothing and read as "no listings
-- match". `amenityTags` is the canonical vocabulary the filter matches instead,
-- derived from the free text on every write.
--
-- Written by hand so the backfill below can ship WITH the column. Adding the
-- column alone would leave every existing listing untagged, which is the same
-- silent-empty-result failure the column exists to prevent.

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "amenityTags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex: GIN, because the filter asks "contains all of these" (`@>`),
-- which a B-tree on an array cannot answer.
CREATE INDEX "Property_amenityTags_idx" ON "Property" USING GIN ("amenityTags");

-- Backfill: mirrors deriveAmenityTags() in
-- src/modules/properties/amenity-tags.ts — same keywords, same tag order, same
-- case-insensitive substring test (lower() + LIKE '%kw%' is what
-- toLowerCase() + includes() does). Keeping the ordering identical is what makes
-- the TypeScript derivation and this backfill produce byte-identical arrays, so
-- re-deriving a row later is a no-op rather than a spurious update.
UPDATE "Property" p
SET "amenityTags" = COALESCE(
  (
    SELECT array_agg(t.tag ORDER BY t.ord)
    FROM (
      VALUES
        (1, 'water',         ARRAY['water', 'borehole']),
        (2, 'prepaid_meter', ARRAY['prepaid', 'pre-paid']),
        (3, 'backup_power',  ARRAY['generator', 'inverter', 'solar', 'backup power']),
        (4, 'security',      ARRAY['security', 'cctv', 'guard', 'gate', 'fenced']),
        (5, 'parking',       ARRAY['parking', 'car park', 'garage']),
        (6, 'furnished',     ARRAY['furnished', 'wardrobe', 'fitted kitchen']),
        (7, 'internet',      ARRAY['internet', 'wifi', 'wi-fi', 'fibre', 'fiber', 'broadband']),
        (8, 'ensuite',       ARRAY['en-suite', 'ensuite', 'en suite'])
    ) AS t(ord, tag, keywords)
    WHERE EXISTS (
      SELECT 1
      FROM unnest(p."amenities") AS a(txt),
           unnest(t.keywords) AS k(kw)
      WHERE lower(a.txt) LIKE '%' || k.kw || '%'
    )
  ),
  ARRAY[]::TEXT[]
);
