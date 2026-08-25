import { IncomingInspectionsView } from "@/components/inspections/IncomingInspectionsView";
import { requireRole } from "@/lib/api/server-auth";

/**
 * Every viewing request on the platform.
 *
 * The same endpoint the landlord queue uses. An admin sees more from it because
 * `listIncomingInspections` drops the `property.ownerId` clause for them — the
 * widening happens on the server, from the session's roles, so this page cannot
 * ask for more than the caller is entitled to and a non-admin reaching it would
 * still see only their own.
 */
export default async function AdminInspectionsPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["ADMIN"]);

  return <IncomingInspectionsView scope="admin" />;
}
