import { NextResponse, type NextRequest } from "next/server";
import { getSql } from "@/lib/server/db";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import {
  allowedTransition,
  ownerInspectionsPath,
  statusVerb,
  toInspection,
  type InspectionRow,
  type InspectionStatus,
} from "@/lib/server/inspections";
import { jsonResponse, readJsonBody, requireUser, serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES: InspectionStatus[] = ["pending", "approved", "rejected", "cancelled", "completed"];

/** Change an inspection's status: `{ status: "APPROVED" }` (case-insensitive). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser();
  if (auth instanceof NextResponse) return auth;

  const body = await readJsonBody(request);
  const raw =
    typeof body === "object" && body !== null && "status" in body && typeof body.status === "string"
      ? body.status.toLowerCase()
      : "";
  const next = STATUSES.find((status) => status === raw);
  if (!next) return jsonResponse({ message: "Choose a valid status." }, 422);

  const { id } = await params;
  try {
    const sql = getSql();
    const found = (await sql`SELECT * FROM inspections WHERE id = ${id} LIMIT 1`) as InspectionRow[];
    const inspection = found[0];
    if (!inspection) return jsonResponse({ message: "Inspection not found." }, 404);
    if (!allowedTransition(inspection, auth, next)) {
      return jsonResponse({ message: "You can't make that change to this inspection." }, 403);
    }

    // Guard on the status we read, so two people acting at once can't clash.
    const updated = (await sql`
      UPDATE inspections SET status = ${next}, updated_at = NOW()
      WHERE id = ${id} AND status = ${inspection.status}
      RETURNING *
    `) as InspectionRow[];
    if (!updated[0]) return jsonResponse({ message: "This inspection was just updated. Refresh and try again." }, 409);

    const what = `"${inspection.property_title}" on ${toInspection(inspection).date}`;
    await logActivity(auth.id, "inspection.updated", `${auth.fullName} ${statusVerb[next]} the inspection of ${what}`, { type: "inspection", id });

    if (auth.id !== inspection.requester_id) {
      await notify(inspection.requester_id, {
        title: `Inspection ${statusVerb[next]}`,
        body: `Your inspection of ${what} (${inspection.time_slot}) was ${statusVerb[next]}.`,
        link: "/student",
      });
    }
    if (inspection.owner_id && auth.id !== inspection.owner_id) {
      const owner = (await sql`SELECT role FROM users WHERE id = ${inspection.owner_id}`) as { role: "landlord" | "lawyer" | "tenant" | "admin" }[];
      await notify(inspection.owner_id, {
        title: `Inspection ${statusVerb[next]}`,
        body: `The inspection of ${what} (${inspection.time_slot}) was ${statusVerb[next]}.`,
        link: ownerInspectionsPath(owner[0]?.role),
      });
    }

    return jsonResponse(toInspection(updated[0]));
  } catch (error) {
    return serverErrorResponse("inspections:update", error);
  }
}
