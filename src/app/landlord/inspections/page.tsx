import { IncomingInspectionsView } from "@/components/inspections/IncomingInspectionsView";
import { requireRole } from "@/lib/api/server-auth";

/**
 * Viewing requests on this landlord's own listings.
 *
 * LAWYER is allowed through alongside LANDLORD, matching the route's own role
 * gate: a lawyer acts on a landlord's behalf on this platform, as they do for
 * listings. Ownership is still the query's WHERE clause on the server, so the
 * role grants sight of nothing by itself.
 */
export default async function LandlordInspectionsPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["LANDLORD", "LAWYER", "ADMIN"]);

  return <IncomingInspectionsView scope="landlord" />;
}
