import { EditPropertyView } from "@/components/property/EditPropertyView";
import { requireRole } from "@/lib/api/server-auth";

/**
 * Edit one of your own listings.
 *
 * The id is in the path rather than a query string because this is a page about
 * one specific listing — and the previous stub lived at a bare
 * `/landlord/properties/edit`, which could not identify which listing to load.
 */
export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Gates the render, not the data: the backend authorizes every API call
  // independently, and ownership is enforced there — a listing that is not
  // yours simply is not found. Must be here rather than in the layout: a layout
  // cannot stop its page from rendering into the RSC payload. See
  // lib/api/server-auth.ts.
  await requireRole(["LANDLORD", "ADMIN"]);

  const { id } = await params;

  return (
    <EditPropertyView
      propertyId={id}
      listHref="/landlord/properties"
      listLabel="Back to my properties"
    />
  );
}
