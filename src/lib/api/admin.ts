import { apiClient } from "./client";
import {
  ownerPropertyListResponseSchema,
  ownerPropertySchema,
  propertyDecisionSchema,
  reviewQueueParamsSchema,
  verificationHistoryResponseSchema,
  type OwnerProperty,
  type OwnerPropertyListResponse,
  type PropertyDecision,
  type ReviewQueueParams,
  type VerificationEntry,
} from "./schemas";

/**
 * Admin surface: the review queue and the decisions made from it.
 *
 * Separate from `propertyApi` because these are not landlord operations. Every
 * one of them is gated by `requireRole("ADMIN")` on the server — the split here
 * keeps the two audiences legible in the code, it is not what enforces anything.
 */
export const adminApi = {
  /**
   * Listings waiting on a decision, oldest first.
   *
   * `status` is settable so a reviewer can go back over what was rejected or
   * suspended: a decision nobody can revisit is a decision nobody can correct.
   */
  async reviewQueue(params?: Partial<ReviewQueueParams>): Promise<OwnerPropertyListResponse> {
    const validated = reviewQueueParamsSchema.parse(params ?? {});
    const { data } = await apiClient.get("/properties/review-queue", { params: validated });
    return ownerPropertyListResponseSchema.parse(data);
  },

  /**
   * Approve, reject, suspend, or send a listing back for another look.
   *
   * The body is validated here too, so a missing rejection reason surfaces as a
   * field error on the form instead of a round trip that comes back 422.
   */
  async decide(id: string, decision: PropertyDecision): Promise<OwnerProperty> {
    const validated = propertyDecisionSchema.parse(decision);
    const { data } = await apiClient.patch(`/properties/${id}/status`, validated);
    return ownerPropertySchema.parse(data);
  },

  /**
   * Everything that has happened to one listing's status, newest first.
   *
   * Not admin-only on the server — a landlord can read their own listing's
   * history, which is the point: they can see the same record the reviewer can.
   */
  async history(id: string): Promise<VerificationEntry[]> {
    const { data } = await apiClient.get(`/properties/${id}/history`);
    return verificationHistoryResponseSchema.parse(data).history;
  },
};
