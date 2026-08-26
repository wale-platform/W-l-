import { MyResidencesView } from "@/components/residences/MyResidencesView";
import { requireRole } from "@/lib/api/server-auth";

/**
 * The places this person has lived, and the reviews those stays entitle them to.
 *
 * Under `/tenant` rather than `/mover`, because `roleHomePath` sends both roles to
 * the same dashboard area — an outgoing tenant documenting where they lived is the
 * same person one step further along. The decision emails link here.
 *
 * `GET /residences/mine` has no role gate on the server (anyone who can hold a
 * session can have lived somewhere, and the query is scoped to them regardless);
 * `POST /residences` is TENANT/MOVER/ADMIN, which is what this gate mirrors.
 */
export default async function TenantResidencesPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["TENANT", "MOVER", "ADMIN"]);

  return <MyResidencesView />;
}
