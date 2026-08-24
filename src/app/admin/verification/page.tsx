import { ReviewQueueView } from "@/components/admin/ReviewQueueView";
import { requireRole } from "@/lib/api/server-auth";

export default async function AdminVerificationPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["ADMIN"]);

  return <ReviewQueueView />;
}
