import { MyReviewsView } from "@/components/reviews/MyReviewsView";
import { requireRole } from "@/lib/api/server-auth";

export const metadata = {
  title: "Your reviews",
  description: "Read and revise what you have written about the places you have lived.",
};

/**
 * What this person has written about where they lived.
 *
 * Under `/tenant` alongside the residence history, for the same reason: `roleHomePath`
 * sends TENANT and MOVER to the same dashboard area, and reviews are the other half of
 * the residence pages.
 *
 * The gate mirrors `POST /properties/:id/reviews` (TENANT/MOVER/ADMIN) rather than the
 * looser one on `GET /reviews/mine`, which has no role requirement — somebody who could
 * never write a review has nothing to manage here.
 */
export default async function TenantReviewsPage() {
  // Gates the render, not the data: the backend authorizes every API call
  // independently. Must be here rather than in the layout — a layout cannot stop
  // its page from rendering into the RSC payload. See lib/api/server-auth.ts.
  await requireRole(["TENANT", "MOVER", "ADMIN"]);

  return <MyReviewsView />;
}
