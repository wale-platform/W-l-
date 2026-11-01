import { NextResponse, type NextRequest } from "next/server";
import { properties } from "@/lib/fixtures/properties";
import { getSql } from "@/lib/server/db";
import { notify } from "@/lib/server/notifications";
import { logActivity } from "@/lib/server/activity";
import { getDbProperty, toPublicProperty } from "@/lib/server/properties";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";

/** Artificial latency to test loading skeleton states on detail views */
const LATENCY_MS = 400;

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  await new Promise((resolve) => setTimeout(resolve, LATENCY_MS));

  const { id } = await params;
  const sample = properties.find((p) => p.id === id);
  if (sample) return NextResponse.json(sample);

  try {
    const property = await getDbProperty(id);
    if (property) return NextResponse.json(toPublicProperty(property));
  } catch (error) {
    return serverErrorResponse("properties:get", error);
  }

  return NextResponse.json(
    { message: `Property with ID ${id} not found` },
    { status: 404 }
  );
}

/** Remove a submitted listing. Owners can delete their own; admins any. */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  try {
    const property = await getDbProperty(id);
    if (!property) return jsonResponse({ message: "Listing not found." }, 404);
    if (property.ownerId !== auth.id && auth.role !== "admin") {
      return jsonResponse({ message: "You can only delete your own listings." }, 403);
    }

    await getSql()`DELETE FROM properties WHERE id = ${id}`;
    await logActivity(auth.id, "listing.deleted", `${auth.fullName} deleted "${property.title}"`, { type: "listing", id });
    return jsonResponse({ success: true, propertyId: id });
  } catch (error) {
    return serverErrorResponse("properties:delete", error);
  }
}

/** Admin-only: mark a submitted listing as verified (or not). */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireUser(["admin"]);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Invalid request body." }, 400);
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("verified" in body) ||
    typeof body.verified !== "boolean"
  ) {
    return jsonResponse({ message: "`verified` must be true or false." }, 422);
  }

  const { id } = await params;
  try {
    const rows = (await getSql()`
      UPDATE properties SET verified = ${body.verified}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, owner_id, title
    `) as { id: string; owner_id: string; title: string }[];
    if (rows.length === 0) return jsonResponse({ message: "Listing not found." }, 404);

    await logActivity(auth.id, body.verified ? "listing.verified" : "listing.unverified", `${auth.fullName} ${body.verified ? "verified" : "unverified"} "${rows[0].title}"`, { type: "listing", id });
    await notify(rows[0].owner_id, body.verified
      ? { title: "Listing verified", body: `"${rows[0].title}" is now verified and shows the WALE badge.`, link: `/properties/${id}` }
      : { title: "Verification removed", body: `"${rows[0].title}" is no longer marked as verified. Contact us if you have questions.`, link: "/contact" });
    return jsonResponse({ success: true, propertyId: id });
  } catch (error) {
    return serverErrorResponse("properties:verify", error);
  }
}
