import { NextResponse, type NextRequest } from "next/server";
import { properties as sampleListings } from "@/lib/fixtures/properties";
import { getSql } from "@/lib/server/db";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import { getDbProperty } from "@/lib/server/properties";
import { ownerInspectionsPath, toInspection, type InspectionRow } from "@/lib/server/inspections";
import {
  jsonResponse,
  newId,
  readJsonBody,
  requireUser,
  serverErrorResponse,
} from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET ?scope=mine   — inspections I requested (default)
 *     ?scope=owner  — requests for listings I own
 *     ?scope=all    — every request (admins only)
 */
export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const scope = request.nextUrl.searchParams.get("scope") ?? "mine";
  if (scope === "all" && auth.role !== "admin") {
    return jsonResponse({ message: "Your account doesn't have access to this action." }, 403);
  }

  try {
    const sql = getSql();
    const rows = (await sql`
      SELECT i.*, r.full_name AS requester_name, r.email AS requester_email, r.phone AS requester_phone,
             o.full_name AS owner_name
      FROM inspections i
      JOIN users r ON r.id = i.requester_id
      LEFT JOIN users o ON o.id = i.owner_id
      WHERE (${scope} = 'all')
         OR (${scope} = 'owner' AND i.owner_id = ${auth.id})
         OR (${scope} NOT IN ('all', 'owner') AND i.requester_id = ${auth.id})
      ORDER BY i.created_at DESC
      LIMIT 500
    `) as InspectionRow[];

    // Requesters don't need their own contact details back.
    return jsonResponse(
      rows.map((row) => {
        const inspection = toInspection(row);
        return scope === "mine" ? { ...inspection, requester: undefined } : inspection;
      }),
    );
  } catch (error) {
    return serverErrorResponse("inspections:list", error);
  }
}

/** Request an inspection: `{ propertyId, date: "YYYY-MM-DD", time: "10:00 AM - 12:00 PM" }`. */
export async function POST(request: Request) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonBody(request);
  const field = (key: string) =>
    typeof body === "object" && body !== null && key in body ? (body as Record<string, unknown>)[key] : undefined;
  const propertyId = field("propertyId");
  const date = field("date");
  const time = field("time");

  if (typeof propertyId !== "string" || !propertyId || propertyId.length > 80) {
    return jsonResponse({ message: "Choose a property to inspect." }, 422);
  }
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return jsonResponse({ message: "Choose a date for the inspection.", field: "date" }, 422);
  }
  const chosen = new Date(`${date}T23:59:59`);
  const latest = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000);
  if (Number.isNaN(chosen.getTime()) || chosen.getTime() < Date.now() || chosen > latest) {
    return jsonResponse({ message: "Choose a date between today and the next four months.", field: "date" }, 422);
  }
  if (typeof time !== "string" || !time.trim() || time.length > 40) {
    return jsonResponse({ message: "Choose a time for the inspection.", field: "time" }, 422);
  }

  try {
    // Sample listings have no owner (WALE handles them); submitted ones do.
    const sample = sampleListings.find((listing) => listing.id === propertyId);
    const submitted = sample ? null : await getDbProperty(propertyId);
    const listing = sample ?? submitted;
    if (!listing) return jsonResponse({ message: "That property no longer exists." }, 404);
    const ownerId = submitted?.ownerId ?? null;
    if (ownerId === auth.id) {
      return jsonResponse({ message: "You can't book an inspection of your own listing." }, 422);
    }

    const sql = getSql();
    const open = await sql`
      SELECT 1 FROM inspections
      WHERE requester_id = ${auth.id} AND property_id = ${propertyId} AND status IN ('pending', 'approved')
      LIMIT 1
    `;
    if (open.length > 0) {
      return jsonResponse({ message: "You already have an inspection booked for this property." }, 409);
    }

    const id = newId("insp");
    const rows = (await sql`
      INSERT INTO inspections (id, property_id, property_title, property_image, property_price, owner_id, requester_id, preferred_date, time_slot)
      VALUES (${id}, ${propertyId}, ${listing.title.slice(0, 150)}, ${listing.images[0] ?? null}, ${listing.price},
              ${ownerId}, ${auth.id}, ${date}, ${time.trim()})
      RETURNING *
    `) as InspectionRow[];

    await logActivity(auth.id, "inspection.requested", `${auth.fullName} requested an inspection of "${listing.title}" on ${date}, ${time.trim()}`, { type: "inspection", id });
    await notify(auth.id, {
      title: "Inspection requested",
      body: `Your request to inspect "${listing.title}" on ${date} (${time.trim()}) has been sent. We'll notify you when it's confirmed.`,
      link: "/student",
    });

    const message = {
      title: "New inspection request",
      body: `${auth.fullName} would like to inspect "${listing.title}" on ${date} (${time.trim()}).`,
    };
    if (ownerId) {
      const owner = (await sql`SELECT role FROM users WHERE id = ${ownerId}`) as { role: "landlord" | "lawyer" | "tenant" }[];
      await notify(ownerId, { ...message, link: ownerInspectionsPath(owner[0]?.role) });
    } else {
      // WALE's own listings: let the admins know.
      const admins = (await sql`SELECT id FROM users WHERE role = 'admin' AND suspended_at IS NULL`) as { id: string }[];
      await Promise.all(admins.map((admin) => notify(admin.id, { ...message, link: "/admin/inspections" })));
    }

    return jsonResponse(toInspection(rows[0]), 201);
  } catch (error) {
    return serverErrorResponse("inspections:create", error);
  }
}
