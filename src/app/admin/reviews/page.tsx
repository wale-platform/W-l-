import { ReportedReviewsView } from "@/components/reviews/ReportedReviewsView";
import { requireRole } from "@/lib/api/server-auth";

export const metadata = {
  title: "Reported reviews",
  description: "Complaints about reviews, and what to do with them.",
};

/**
 * The moderation queue for lived-experience reviews.
 *
 * The API endpoints behind this are `GET /reviews/reported` and
 * `PATCH /reviews/:id/moderate` — deliberately not under `/admin`. What keeps them away
 * from normal users is `requireRole("ADMIN")` on the server, not the shape of the path,
 * and the review a moderator acts on is the same resource its author edits.
 */
export default async function AdminReviewsPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["ADMIN"]);

  return <ReportedReviewsView />;
}
