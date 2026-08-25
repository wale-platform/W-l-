import { MyInspectionsView } from "@/components/inspections/MyInspectionsView";
import { requireRole } from "@/lib/api/server-auth";

/**
 * The viewings this person has asked for.
 *
 * `GET /inspections/mine` has no role gate on the server — anyone who can hold a
 * session can have asked to view something, and the query is scoped to them
 * regardless. The gate here is only about which dashboard this page belongs to.
 */
export default async function TenantInspectionsPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["TENANT", "MOVER", "ADMIN"]);

  return <MyInspectionsView />;
}
