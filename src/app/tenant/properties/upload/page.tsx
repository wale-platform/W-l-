import { requireRole } from "@/lib/api/server-auth";
import UploadApartmentForm from "./UploadApartmentForm";

export default async function UploadApartmentPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. This wrapper exists because the view below is a client
  // component and cannot await — and because a layout cannot stop its page from
  // rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["TENANT", "MOVER", "ADMIN"]);

  return <UploadApartmentForm />;
}
