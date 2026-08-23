import { OwnerPropertiesView } from "@/components/property/OwnerPropertiesView";
import { requireRole } from "@/lib/api/server-auth";

/**
 * A lawyer's own submissions.
 *
 * The same `GET /properties/mine` the landlord dashboard uses — a lawyer owns the
 * records they created, and the lifecycle is identical, so the wording differs
 * and nothing else does.
 */
export default async function LawyerPropertiesPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["LAWYER", "ADMIN"]);

  return (
    <OwnerPropertiesView
      eyebrow="Lawyer"
      title="Manage listings"
      lead="Properties you've submitted on behalf of landlords, and where each one stands."
      addHref="/lawyer/properties/upload"
      addLabel="Submit a property"
      editHref={(id) => `/lawyer/properties/${id}/edit`}
      empty={{
        title: "No properties submitted yet",
        description:
          "Properties you submit on behalf of landlords will appear here, from draft through to verified.",
        action: "Submit your first property",
      }}
    />
  );
}
