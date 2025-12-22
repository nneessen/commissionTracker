// src/hooks/documents/useDocumentExpiration.ts
import { useQuery } from "@tanstack/react-query";
import {
  documentExpirationService,
  type ExpiringDocumentsSummary,
} from "../../services/documents/DocumentExpirationService";

/**
 * Query key factory for document expiration queries
 */
export const documentExpirationKeys = {
  all: ["documents", "expiration"] as const,
  expiring: (userId: string) =>
    [...documentExpirationKeys.all, "expiring", userId] as const,
  counts: (userId: string) =>
    [...documentExpirationKeys.all, "counts", userId] as const,
};

/**
 * Hook to fetch documents expiring within 90 days, categorized by urgency
 */
export function useExpiringDocuments(userId: string | undefined) {
  return useQuery<ExpiringDocumentsSummary>({
    queryKey: documentExpirationKeys.expiring(userId ?? ""),
    queryFn: async () => {
      if (!userId) {
        return {
          critical: [],
          warning: [],
          upcoming: [],
          counts: { critical: 0, warning: 0, upcoming: 0, total: 0 },
        };
      }
      return documentExpirationService.getExpiringDocuments(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch expiration counts for dashboard badges
 */
export function useExpirationCounts(userId: string | undefined) {
  return useQuery({
    queryKey: documentExpirationKeys.counts(userId ?? ""),
    queryFn: async () => {
      if (!userId) {
        return { critical: 0, warning: 0, upcoming: 0 };
      }
      return documentExpirationService.getExpirationCounts(userId);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

/**
 * Hook to get the total count of expiring documents (for badges)
 */
export function useExpiringDocumentCount(userId: string | undefined) {
  const { data } = useExpirationCounts(userId);
  return (data?.critical ?? 0) + (data?.warning ?? 0) + (data?.upcoming ?? 0);
}

/**
 * Hook to get only critical expiring documents count
 */
export function useCriticalExpiringCount(userId: string | undefined) {
  const { data } = useExpirationCounts(userId);
  return data?.critical ?? 0;
}
