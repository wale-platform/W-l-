import { IncomingResidencesView } from "@/components/residences/IncomingResidencesView";
import { requireRole } from "@/lib/api/server-auth";

/**
 * Claims that people lived in this landlord's own properties.
 *
 * LAWYER is allowed through alongside LANDLORD, matching the route's own role gate:
 * a lawyer acts on a landlord's behalf on this platform, as they do for listings.
 * Ownership is still the query's WHERE clause on the server, so the role grants
 * sight of nothing by itself.
 */
export default async function LandlordResidencesPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["LANDLORD", "LAWYER", "ADMIN"]);

  return <IncomingResidencesView scope="landlord" />;
}
