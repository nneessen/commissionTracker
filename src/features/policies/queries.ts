// src/features/policies/queries.ts

import { queryOptions } from "@tanstack/react-query";
// eslint-disable-next-line no-restricted-imports
import { policyService } from "@/services/policies/policyService";
import type { PolicyFilters } from "@/types/policy.types";

export const policyKeys = {
  all: ["policies"] as const,
  lists: () => [...policyKeys.all, "list"] as const,
  list: (filters: PolicyFilters = {}) =>
    [...policyKeys.lists(), filters] as const,
  details: () => [...policyKeys.all, "detail"] as const,
  detail: (id: string) => [...policyKeys.details(), id] as const,
  count: (filters?: PolicyFilters) =>
    [...policyKeys.all, "count", filters] as const,
  metrics: (filters?: PolicyFilters) =>
    [...policyKeys.all, "metrics", filters] as const,
  byLeadPurchase: (leadPurchaseId: string) =>
    [...policyKeys.all, "by-lead-purchase", leadPurchaseId] as const,
  unlinkedRecent: (userId: string) =>
    [...policyKeys.all, "unlinked-recent", userId] as const,
};

export const policyQueries = {
  detail: (id: string) =>
    queryOptions({
      queryKey: policyKeys.detail(id),
      queryFn: () => policyService.getById(id),
      staleTime: 1000 * 60 * 5, // 5 minutes
    }),

  list: (filters: PolicyFilters = {}) =>
    queryOptions({
      queryKey: policyKeys.list(filters),
      queryFn: () => policyService.getFiltered(filters),
      staleTime: 1000 * 60 * 5,
    }),

  paginated: (
    page: number,
    pageSize: number,
    filters: PolicyFilters = {},
    sortConfig?: { field: string; direction: "asc" | "desc" },
  ) =>
    queryOptions({
      queryKey: [
        ...policyKeys.list(filters),
        "paginated",
        page,
        pageSize,
        sortConfig,
      ] as const,
      queryFn: () =>
        policyService.getPaginated(page, pageSize, filters, sortConfig),
      staleTime: 1000 * 60 * 5,
    }),

  count: (filters?: PolicyFilters) =>
    queryOptions({
      queryKey: policyKeys.count(filters),
      queryFn: () => policyService.getCount(filters),
      staleTime: 1000 * 60 * 5,
    }),

  metrics: (filters?: PolicyFilters) =>
    queryOptions({
      queryKey: policyKeys.metrics(filters),
      queryFn: () => policyService.getAggregateMetrics(filters),
      staleTime: 1000 * 60 * 5,
    }),

  byLeadPurchase: (leadPurchaseId: string) =>
    queryOptions({
      queryKey: policyKeys.byLeadPurchase(leadPurchaseId),
      queryFn: () => policyService.findByLeadPurchaseId(leadPurchaseId),
      staleTime: 1000 * 60 * 5,
    }),

  unlinkedRecent: (userId: string) =>
    queryOptions({
      queryKey: policyKeys.unlinkedRecent(userId),
      queryFn: () => policyService.findUnlinkedRecent(userId),
      staleTime: 1000 * 60 * 2, // 2 minutes - refresh more often
    }),
};
