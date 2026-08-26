import { IncomingResidencesView } from "@/components/residences/IncomingResidencesView";
import { requireRole } from "@/lib/api/server-auth";

/**
 * Every residence claim on the platform.
 *
 * The same endpoint the landlord queue uses. An admin sees more from it because
 * `listIncomingResidences` drops the `property.ownerId` clause for them — the
 * widening happens on the server, from the session's roles, so this page cannot ask
 * for more than the caller is entitled to and a non-admin reaching it would still
 * see only their own.
 *
 * The admin scope is what makes a claim against a property whose owner has gone
 * quiet decidable at all. It does not extend to their own claims: the service
 * refuses a decision by the claimant regardless of role, and the database has the
 * same rule as a CHECK constraint.
 */
export default async function AdminResidencesPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["ADMIN"]);

  return <IncomingResidencesView scope="admin" />;
}
