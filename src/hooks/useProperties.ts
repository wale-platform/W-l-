"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { propertyApi } from "@/lib/api";
import type {
  MyPropertiesParams,
  PropertyPayload,
  SearchParams,
} from "@/lib/api/schemas";

/**
 * Query keys are centralised so cache invalidation stays consistent
 * across the app and typos cannot silently create a separate cache
 * entry.
 */
export const propertyKeys = {
  all: ["properties"] as const,
  list: (params: Partial<SearchParams>) => ["properties", "list", params] as const,
  detail: (id: string) => ["properties", "detail", id] as const,
  /** Every owner-scoped query, for a blanket invalidation after a write. */
  mine: ["properties", "mine"] as const,
  mineList: (params: Partial<MyPropertiesParams>) =>
    ["properties", "mine", "list", params] as const,
  mineDetail: (id: string) => ["properties", "mine", "detail", id] as const,
};

export function useProperties(params: Partial<SearchParams> = {}) {
  return useQuery({
    queryKey: propertyKeys.list(params),
    queryFn: () => propertyApi.list(params),
  });
}

export function useProperty(id: string) {
  return useQuery({
    queryKey: propertyKeys.detail(id),
    queryFn: () => propertyApi.getById(id),
    enabled: Boolean(id),
  });
}

/** The signed-in owner's listings, in any state. */
export function useMyProperties(params: Partial<MyPropertiesParams> = {}) {
  return useQuery({
    queryKey: propertyKeys.mineList(params),
    queryFn: () => propertyApi.listMine(params),
  });
}

/** One of the owner's listings — the edit form's source of truth. */
export function useMyProperty(id: string) {
  return useQuery({
    queryKey: propertyKeys.mineDetail(id),
    queryFn: () => propertyApi.getMine(id),
    enabled: Boolean(id),
  });
}

/**
 * Writes.
 *
 * Every mutation invalidates BOTH `propertyKeys.all` and `propertyKeys.mine`,
 * because a write can move a listing in and out of the public catalogue:
 * submitting a draft makes it publicly visible, and editing a verified listing
 * withdraws its badge. Invalidating only the owner's view would leave the
 * public list showing a state the server no longer agrees with.
 *
 * `propertyKeys.all` is the prefix of `mine` as well, so one invalidation would
 * do — it is spelled out because that overlap is an accident of the key shape,
 * not something later edits should have to preserve.
 */
function useInvalidateProperties() {
  const queryClient = useQueryClient();

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: propertyKeys.all }),
      queryClient.invalidateQueries({ queryKey: propertyKeys.mine }),
    ]);
  };
}

export function useCreateProperty() {
  const invalidate = useInvalidateProperties();

  return useMutation({
    mutationFn: (payload: PropertyPayload) => propertyApi.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateProperty(id: string) {
  const invalidate = useInvalidateProperties();

  return useMutation({
    mutationFn: (payload: Partial<PropertyPayload>) => propertyApi.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useSubmitProperty() {
  const invalidate = useInvalidateProperties();

  return useMutation({
    mutationFn: (id: string) => propertyApi.submit(id),
    onSuccess: invalidate,
  });
}

export function useDeleteProperty() {
  const invalidate = useInvalidateProperties();

  return useMutation({
    mutationFn: (id: string) => propertyApi.remove(id),
    onSuccess: invalidate,
  });
}
