"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { reviewApi } from "@/lib/api";
import { residenceKeys } from "./useResidences";
import type {
  CreateReviewInput,
  ModerateReviewInput,
  ReportListParams,
  ReportReviewInput,
  ReviewListParams,
  UpdateReviewInput,
} from "@/lib/api/schemas";

/**
 * Lived-experience reviews.
 *
 * WRITING A REVIEW INVALIDATES RESIDENCE CLAIMS TOO, and that is the one thing in this
 * file worth reading. A review hangs off a claim, and the claim carries `hasReview` —
 * which is what decides whether the residence history offers a "write a review" button
 * or says the review already exists. Both are on screen at the same moment, because the
 * form is opened from that very list. Without the cross-invalidation the button would
 * still be there after the review was written.
 *
 * The invalidation is deliberately one-directional. `useResidences` does NOT invalidate
 * these queries when an owner confirms a claim, even though confirming promotes a
 * review into the verified average: an owner deciding on a claim in their queue is not
 * looking at that property's public review list, so there is nothing stale on their
 * screen to fix and the next reader gets a fresh read anyway.
 *
 * `summary` gets its own key rather than being folded into the list, because the two
 * are separate endpoints and the list is paginated — reading page three must not
 * refetch the aggregate above it.
 */
export const reviewKeys = {
  all: ["reviews"] as const,
  /** The public list on one listing page, per page and filter. */
  forProperty: (propertyId: string, params: Partial<ReviewListParams>) =>
    ["reviews", "property", propertyId, params] as const,
  /** The aggregate above it. Same property, different endpoint. */
  summary: (propertyId: string) => ["reviews", "summary", propertyId] as const,
  mine: (params: Partial<ReviewListParams>) => ["reviews", "mine", params] as const,
  reported: (params: Partial<ReportListParams>) => ["reviews", "reported", params] as const,
};

/** The reviews on a listing page. Works signed out; a session only sets `mine`. */
export function usePropertyReviews(propertyId: string, params: Partial<ReviewListParams> = {}) {
  return useQuery({
    queryKey: reviewKeys.forProperty(propertyId, params),
    queryFn: () => reviewApi.forProperty(propertyId, params),
  });
}

/**
 * The rating and counts above that list.
 *
 * Nothing here fills in a number when `verified.averages` is null. The null is the
 * answer — no confirmed review has been written — and a default would invent a rating.
 */
export function useExperienceSummary(propertyId: string) {
  return useQuery({
    queryKey: reviewKeys.summary(propertyId),
    queryFn: () => reviewApi.summary(propertyId),
  });
}

/** Every review the signed-in person has written, hidden ones included. */
export function useMyReviews(params: Partial<ReviewListParams> = {}) {
  return useQuery({
    queryKey: reviewKeys.mine(params),
    queryFn: () => reviewApi.mine(params),
  });
}

/** The admin queue of complaints. */
export function useReportedReviews(params: Partial<ReportListParams> = {}) {
  return useQuery({
    queryKey: reviewKeys.reported(params),
    queryFn: () => reviewApi.reported(params),
  });
}

/**
 * Publish a review of a place you lived.
 *
 * Invalidates the residence tree as well as the review tree — see the note at the top
 * of this file. This is the mutation that cross-invalidation exists for.
 */
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      propertyId,
      payload,
    }: {
      propertyId: string;
      payload: CreateReviewInput;
    }) => reviewApi.create(propertyId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: reviewKeys.all });
      // `hasReview` on the claim this came from has just flipped.
      void queryClient.invalidateQueries({ queryKey: residenceKeys.all });
    },
  });
}

/**
 * Revise your own review.
 *
 * The review tree only: editing changes the words and the scores, and the claim it
 * hangs off already said a review existed.
 */
export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateReviewInput }) =>
      reviewApi.update(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}

/**
 * Report a review.
 *
 * Invalidates NOTHING, on purpose. A report changes no field of the review, so every
 * list that was correct before is still correct — and a refetch here would imply
 * something on the page had changed when the whole design of the endpoint is that
 * nothing has. The reporter is told their complaint landed; that is all that happened.
 */
export function useReportReview() {
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ReportReviewInput }) =>
      reviewApi.report(id, payload),
  });
}

/**
 * An admin's decision on a reported review.
 *
 * Invalidates the whole review tree: the decision empties the complaint out of the
 * queue and, if it hid or restored the review, changes what a listing page shows.
 */
export function useModerateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModerateReviewInput }) =>
      reviewApi.moderate(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
  });
}
