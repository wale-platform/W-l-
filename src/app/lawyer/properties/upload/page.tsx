import { requireRole } from "@/lib/api/server-auth";
import UploadPropertyForm from "./UploadPropertyForm";

export default async function UploadPropertyPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. This wrapper exists because the view below is a client
  // component and cannot await — and because a layout cannot stop its page from
  // rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["LAWYER", "ADMIN"]);

  return <UploadPropertyForm />;
}
