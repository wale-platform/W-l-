"use client";

import { useQuery } from "@tanstack/react-query";
import { propertyApi } from "@/lib/api";
import type { SearchParams } from "@/lib/api/schemas";

/**
 * Query keys are centralised so cache invalidation stays consistent
 * across the app and typos cannot silently create a separate cache
 * entry.
 */
export const propertyKeys = {
  all: ["properties"] as const,
  list: (params: Partial<SearchParams>) => ["properties", "list", params] as const,
  detail: (id: string) => ["properties", "detail", id] as const,
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
