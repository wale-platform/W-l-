import { OwnerPropertiesView } from "@/components/property/OwnerPropertiesView";
import { requireRole } from "@/lib/api/server-auth";

export default async function PropertiesPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. This wrapper exists because the view below is a client
  // component and cannot await — and because a layout cannot stop its page from
  // rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["LANDLORD", "ADMIN"]);

  return (
    <OwnerPropertiesView
      eyebrow="Properties"
      title="My properties"
      lead="Every listing you've added, and where each one stands."
      addHref="/landlord/upload-property"
      addLabel="Add a property"
      editHref={(id) => `/landlord/properties/${id}/edit`}
      empty={{
        title: "No properties yet",
        description: "Add your first property to start reaching students on WALE.",
        action: "Add your first property",
      }}
    />
  );
}
