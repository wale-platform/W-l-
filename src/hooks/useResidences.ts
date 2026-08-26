"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { residenceApi } from "@/lib/api";
import type { CreateResidenceInput, ResidenceListParams } from "@/lib/api/schemas";

/**
 * Residence claims, from both sides.
 *
 * Every mutation here changes what BOTH people see, so each one invalidates the
 * whole `residences` tree rather than the list it was called from — the same
 * reasoning as `useInspections`. An owner confirming a claim has to turn the
 * claimant's "awaiting the landlord" into "confirmed", and the two of them are
 * looking at different queries of the same row.
 *
 * A confirmation also changes something outside this tree: it is what makes a
 * review count towards a property's verified average. Nothing here invalidates the
 * review queries, because a claim decided in this queue is one whose review — if
 * any — lives on a page the person deciding is not looking at. The review layer
 * invalidates in the other direction (writing a review flips `hasReview` on the
 * claim it came from), which is the direction where both views are on screen.
 */
export const residenceKeys = {
  all: ["residences"] as const,
  mine: (params: Partial<ResidenceListParams>) => ["residences", "mine", params] as const,
  incoming: (params: Partial<ResidenceListParams>) =>
    ["residences", "incoming", params] as const,
};

/** The claims the signed-in person has made. */
export function useMyResidences(params: Partial<ResidenceListParams> = {}) {
  return useQuery({
    queryKey: residenceKeys.mine(params),
    queryFn: () => residenceApi.mine(params),
  });
}

/** Claims against the signed-in owner's properties — everyone's, for an admin. */
export function useIncomingResidences(params: Partial<ResidenceListParams> = {}) {
  return useQuery({
    queryKey: residenceKeys.incoming(params),
    queryFn: () => residenceApi.incoming(params),
  });
}

/** Record a place you lived. Lands UNVERIFIED; the owner is emailed. */
export function useClaimResidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateResidenceInput) => residenceApi.claim(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: residenceKeys.all }),
  });
}

/** The owner agrees the person lived there. One click, no body. */
export function useConfirmResidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => residenceApi.confirm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: residenceKeys.all }),
  });
}

/** The owner refuses, in words the claimant reads verbatim. */
export function useRejectResidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      residenceApi.reject(id, { reason }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: residenceKeys.all }),
  });
}

/** The claimant takes back a claim nobody has decided on yet. */
export function useWithdrawResidence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => residenceApi.withdraw(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: residenceKeys.all }),
  });
}
