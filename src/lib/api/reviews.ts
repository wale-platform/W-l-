import { apiClient } from "./client";
import {
  createReviewSchema,
  experienceSummarySchema,
  moderateReviewSchema,
  moderationResultSchema,
  myReviewListResponseSchema,
  myReviewSchema,
  publicReviewListResponseSchema,
  reportAcceptedSchema,
  reportListParamsSchema,
  reportReviewSchema,
  reportedReviewListResponseSchema,
  reviewListParamsSchema,
  updateReviewSchema,
  type CreateReviewInput,
  type ExperienceSummary,
  type ModerateReviewInput,
  type ModerationResult,
  type MyReview,
  type MyReviewListResponse,
  type PublicReviewListResponse,
  type ReportListParams,
  type ReportReviewInput,
  type ReportedReviewListResponse,
  type ReviewListParams,
  type UpdateReviewInput,
} from "./schemas";

/**
 * Lived-experience reviews: what it was actually like to live somewhere.
 *
 * TWO ADDRESSES, matching the API. A review is always OF a property, so it is created
 * and listed under `/properties/:id/reviews`; everything addressed by the review's own
 * id lives under `/reviews`. That is the server's shape, not a choice made here.
 *
 * The admin calls are `/reviews/reported` and `/reviews/:id/moderate` rather than
 * anything under `/admin` — the same convention as the listing verification queue.
 * What keeps them away from normal users is `requireRole("ADMIN")` on the server, not
 * the path they sit at.
 *
 * Nothing in this module computes `verified`, and nothing averages anything. Both come
 * off the response: the server recomputes `verified` from the residence claim's current
 * status on every read, and the averages exclude unconfirmed claims. A browser that
 * derived either would eventually publish a rating the platform never stood behind.
 */
export const reviewApi = {
  /**
   * The reviews on a listing page. Works signed out.
   *
   * A session only changes `mine`, which is how the page knows not to offer somebody a
   * report button on their own words. `verifiedOnly` is the reader's filter and
   * defaults to off — see the schema for why that default is not the platform's to
   * flip.
   */
  async forProperty(
    propertyId: string,
    params?: Partial<ReviewListParams>,
  ): Promise<PublicReviewListResponse> {
    const validated = reviewListParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get(`/properties/${propertyId}/reviews`, {
      params: validated,
    });
    return publicReviewListResponseSchema.parse(data);
  },

  /**
   * The aggregate above that list. Public and session-blind — an average does not
   * change depending on who is looking.
   *
   * `verified.averages` comes back null at zero reviews. Callers must render that as
   * "no rating yet"; substituting 0 would show one star out of five on a home nobody
   * has said anything about.
   */
  async summary(propertyId: string): Promise<ExperienceSummary> {
    const { data } = await apiClient.get(`/properties/${propertyId}/experience-summary`);
    return experienceSummarySchema.parse(data);
  },

  /**
   * Review a place you lived.
   *
   * The path names the property and the body names the tenancy, and the server checks
   * the claim belongs both to the caller and to that property — a mismatch is one 404
   * for all three ways of being wrong. A 409 means either the claim was rejected (so
   * there is nothing to say) or that tenancy is already reviewed; show the message.
   */
  async create(propertyId: string, payload: CreateReviewInput): Promise<MyReview> {
    const validated = createReviewSchema.parse(payload);
    const { data } = await apiClient.post(`/properties/${propertyId}/reviews`, validated);
    return myReviewSchema.parse(data);
  },

  /**
   * Revise your own review.
   *
   * Addressed by the review's id with no property in the path, because a review never
   * moves between properties. A 409 means an admin has taken it down — at which point
   * it is deliberately no longer editable, and the message says so.
   */
  async update(id: string, payload: UpdateReviewInput): Promise<MyReview> {
    const validated = updateReviewSchema.parse(payload);
    const { data } = await apiClient.patch(`/reviews/${id}`, validated);
    return myReviewSchema.parse(data);
  },

  /** Every review this person has written, including any an admin has hidden. */
  async mine(params?: Partial<ReviewListParams>): Promise<MyReviewListResponse> {
    const validated = reviewListParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/reviews/mine", { params: validated });
    return myReviewListResponseSchema.parse(data);
  },

  /**
   * Report a review to an admin.
   *
   * Deliberately inert: it writes a complaint and touches no field of the review, so
   * calling it changes nothing a reader can see. The answer is `{ reported: true }` and
   * nothing else — not the review's status, which this does not change, and not what an
   * admin later does about it.
   */
  async report(id: string, payload: ReportReviewInput): Promise<void> {
    const validated = reportReviewSchema.parse(payload);
    const { data } = await apiClient.post(`/reviews/${id}/report`, validated);
    reportAcceptedSchema.parse(data);
  },

  /** The admin queue of complaints, oldest outstanding first. */
  async reported(params?: Partial<ReportListParams>): Promise<ReportedReviewListResponse> {
    const validated = reportListParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/reviews/reported", { params: validated });
    return reportedReviewListResponseSchema.parse(data);
  },

  /**
   * An admin's decision. The only call that can change a review's visibility.
   *
   * Sending PUBLISHED on an already-published review is how a complaint is dismissed:
   * the reports close, the review stays up. `reportsResolved` in the answer is how many
   * outstanding complaints that closed.
   */
  async moderate(id: string, payload: ModerateReviewInput): Promise<ModerationResult> {
    const validated = moderateReviewSchema.parse(payload);
    const { data } = await apiClient.patch(`/reviews/${id}/moderate`, validated);
    return moderationResultSchema.parse(data);
  },
};
