"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { inspectionApi } from "@/lib/api";
import type {
  InspectionDecision,
  InspectionListParams,
} from "@/lib/api/schemas";

/**
 * Viewing requests, from both sides.
 *
 * Every mutation here changes what BOTH people see, so each one invalidates the
 * whole `inspections` tree rather than the list it was called from. A landlord
 * confirming a request has to change the tenant's "you have asked to view this"
 * into "confirmed" — and the two of them are looking at different queries of the
 * same row, sometimes in the same browser during testing. Being precise about
 * which key to drop would buy nothing here: these lists are small, and a stale
 * "awaiting reply" next to a viewing that was confirmed is worse than a refetch.
 */
export const inspectionKeys = {
  all: ["inspections"] as const,
  mine: (params: Partial<InspectionListParams>) => ["inspections", "mine", params] as const,
  incoming: (params: Partial<InspectionListParams>) =>
    ["inspections", "incoming", params] as const,
  forProperty: (propertyId: string) => ["inspections", "property", propertyId] as const,
};

/** The requests the signed-in person has made. */
export function useMyInspections(params: Partial<InspectionListParams> = {}) {
  return useQuery({
    queryKey: inspectionKeys.mine(params),
    queryFn: () => inspectionApi.mine(params),
  });
}

/** The requests made on the signed-in landlord's listings — everyone's, for an admin. */
export function useIncomingInspections(params: Partial<InspectionListParams> = {}) {
  return useQuery({
    queryKey: inspectionKeys.incoming(params),
    queryFn: () => inspectionApi.incoming(params),
  });
}

/**
 * Whether the viewer already has a live request on one listing.
 *
 * `enabled` is how the listing page avoids asking on behalf of a visitor who is
 * not signed in: the endpoint needs a session, so calling it while signed out
 * would be a guaranteed 401 on every public listing view.
 *
 * `null` is a real answer ("you have not asked"), so it must not be treated as
 * "no data" — hence no `staleTime` games and no placeholder.
 */
export function useMyInspectionFor(propertyId: string, enabled = true) {
  return useQuery({
    queryKey: inspectionKeys.forProperty(propertyId),
    queryFn: () => inspectionApi.mineFor(propertyId),
    enabled: enabled && Boolean(propertyId),
  });
}

/**
 * Ask to view a listing.
 *
 * Invalidates the per-listing query so the button on the page turns into "you
 * have asked to view this" without a reload, and the tenant's own list so the
 * new request is there when they navigate to it.
 */
export function useRequestInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      propertyId,
      preferredAt,
      note,
    }: {
      propertyId: string;
      preferredAt: string;
      note?: string;
    }) => inspectionApi.request(propertyId, { preferredAt, ...(note ? { note } : {}) }),
    onSuccess: async (_data, { propertyId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inspectionKeys.forProperty(propertyId) }),
        queryClient.invalidateQueries({ queryKey: inspectionKeys.all }),
      ]);
    },
  });
}

/** The landlord's answer: confirmed, declined, or it happened. */
export function useRespondToInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: InspectionDecision }) =>
      inspectionApi.respond(id, decision),
    onSuccess: async (inspection) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inspectionKeys.all }),
        // The tenant's listing page is asking about this property specifically.
        queryClient.invalidateQueries({
          queryKey: inspectionKeys.forProperty(inspection.property.id),
        }),
      ]);
    },
  });
}

/** The tenant calls off their own request. */
export function useCancelInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => inspectionApi.cancel(id),
    onSuccess: async (inspection) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inspectionKeys.all }),
        queryClient.invalidateQueries({
          queryKey: inspectionKeys.forProperty(inspection.property.id),
        }),
      ]);
    },
  });
}
