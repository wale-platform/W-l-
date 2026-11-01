import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/server/db";
import { propertyImageUrl } from "@/lib/server/properties";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Submitted listings with their owners: `?status=pending|verified`, `?q=`. */
export async function GET(request: NextRequest) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const q = (params.get("q") ?? "").trim().toLowerCase().slice(0, 100);

  try {
    const rows = await getSql()`
      SELECT p.id, p.title, p.price, p.type, p.address, p.city, p.state, p.university, p.source,
             p.verified, p.created_at, p.contact_phone, p.boosted_until,
             u.id AS owner_id, u.full_name AS owner_name, u.email AS owner_email,
             (SELECT i.id FROM property_images i WHERE i.property_id = p.id ORDER BY i.position LIMIT 1) AS cover_id,
             (SELECT COUNT(*) FROM inspections x WHERE x.property_id = p.id)::int AS inspections
      FROM properties p
      JOIN users u ON u.id = p.owner_id
      WHERE (${status}::text IS NULL OR ${status} NOT IN ('pending', 'verified')
             OR (${status} = 'pending' AND NOT p.verified)
             OR (${status} = 'verified' AND p.verified))
        AND (${q} = '' OR LOWER(p.title) LIKE ${`%${q}%`} OR LOWER(p.address) LIKE ${`%${q}%`}
             OR LOWER(p.city) LIKE ${`%${q}%`} OR LOWER(u.full_name) LIKE ${`%${q}%`} OR LOWER(u.email) LIKE ${`%${q}%`})
      ORDER BY p.verified ASC, p.created_at DESC
      LIMIT 500
    `;

    return jsonResponse(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        price: row.price,
        type: row.type,
        location: [row.address, row.city, row.state].filter(Boolean).join(", "),
        university: row.university,
        source: row.source,
        verified: row.verified,
        boostedUntil: row.boosted_until ? new Date(row.boosted_until).toISOString() : null,
        createdAt: new Date(row.created_at).toISOString(),
        image: row.cover_id ? propertyImageUrl(row.cover_id) : null,
        inspections: row.inspections,
        owner: { id: row.owner_id, name: row.owner_name, email: row.owner_email, phone: row.contact_phone },
      })),
    );
  } catch (error) {
    return serverErrorResponse("admin:listings", error);
  }
}
