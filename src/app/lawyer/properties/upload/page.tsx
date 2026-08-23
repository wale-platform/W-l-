import { NewPropertyView } from "@/components/property/NewPropertyView";
import { requireRole } from "@/lib/api/server-auth";

export default async function UploadPropertyPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. This wrapper exists because the view below is a client
  // component and cannot await — and because a layout cannot stop its page from
  // rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["LAWYER", "ADMIN"]);

  return (
    <NewPropertyView
      eyebrow="Lawyer"
      title="Submit a property"
      lead="Fill in the landlord's details along with the property's. We'll save it as a draft so you can check everything before sending it for verification."
      listHref="/lawyer/properties"
      onBehalfOfOwner
    />
  );
}
