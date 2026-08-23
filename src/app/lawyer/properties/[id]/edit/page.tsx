import { EditPropertyView } from "@/components/property/EditPropertyView";
import { requireRole } from "@/lib/api/server-auth";

/** Edit a listing this lawyer submitted — chiefly to answer a rejection. */
export default async function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Gates the render, not the data: the backend authorizes every API call
  // independently, and ownership is enforced there — a listing submitted by
  // another lawyer simply is not found. Must be here rather than in the layout:
  // a layout cannot stop its page from rendering into the RSC payload. See
  // lib/api/server-auth.ts.
  await requireRole(["LAWYER", "ADMIN"]);

  const { id } = await params;

  return (
    <EditPropertyView
      propertyId={id}
      listHref="/lawyer/properties"
      listLabel="Back to my listings"
      onBehalfOfOwner
    />
  );
}
