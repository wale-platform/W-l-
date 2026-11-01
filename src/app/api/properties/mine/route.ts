import { NextResponse } from "next/server";
import { LISTING_ROLES } from "@/lib/api/schemas";
import { listDbProperties, toPublicProperty } from "@/lib/server/properties";
import { jsonResponse, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Listings submitted by the signed-in landlord / lawyer / tenant. */
export async function GET() {
  const auth = await requireUser(LISTING_ROLES);
  if (auth instanceof NextResponse) return auth;

  try {
    const properties = (await listDbProperties({ ownerId: auth.id })).map(toPublicProperty);
    return jsonResponse({
      properties,
      total: properties.length,
      page: 1,
      pageSize: Math.max(1, properties.length),
      totalPages: 1,
    });
  } catch (error) {
    return serverErrorResponse("properties:mine", error);
  }
}
