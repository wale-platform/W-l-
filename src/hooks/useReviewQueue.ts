"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi } from "@/lib/api";
import type { PropertyDecision, ReviewQueueParams } from "@/lib/api/schemas";
import { propertyKeys } from "./useProperties";

/**
 * The admin review queue and the decisions made from it.
 *
 * Kept apart from `useProperties` because these are not the landlord's
 * operations, but they invalidate the same caches: a decision changes what the
 * public catalogue shows and what the owner sees on their dashboard.
 */
export const reviewKeys = {
  all: ["review"] as const,
  queue: (params: Partial<ReviewQueueParams>) => ["review", "queue", params] as const,
  history: (id: string) => ["review", "history", id] as const,
};

export function useReviewQueue(params: Partial<ReviewQueueParams> = {}) {
  return useQuery({
    queryKey: reviewKeys.queue(params),
    queryFn: () => adminApi.reviewQueue(params),
  });
}

/** One listing's status history — readable by an admin and by its own owner. */
export function useVerificationHistory(id: string, enabled = true) {
  return useQuery({
    queryKey: reviewKeys.history(id),
    queryFn: () => adminApi.history(id),
    enabled: enabled && Boolean(id),
  });
}

/**
 * Approve, reject, suspend, or send a listing back for another look.
 *
 * Invalidates the queue (the listing has left it), the property caches (a
 * decision changes the verified badge and the owner's dashboard), and the
 * listing's own history (the decision just became its newest row).
 */
export function useDecideProperty() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: PropertyDecision }) =>
      adminApi.decide(id, decision),
    onSuccess: async (_data, { id }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: reviewKeys.all }),
        queryClient.invalidateQueries({ queryKey: propertyKeys.all }),
        queryClient.invalidateQueries({ queryKey: propertyKeys.mine }),
        queryClient.invalidateQueries({ queryKey: reviewKeys.history(id) }),
      ]);
    },
  });
}
