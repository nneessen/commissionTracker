// src/hooks/commissions/useCommissions.ts

import { useQuery } from "@tanstack/react-query";
import { commissionService } from "../../services/commissions/commissionService";
import { useAuth } from "../../contexts/AuthContext";

export interface UseCommissionsOptions {
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch commissions for the current user using TanStack Query
 *
 * @param options Optional configuration for the query
 * @returns TanStack Query result with commissions data
 */
export const useCommissions = (options?: UseCommissionsOptions) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["commissions", user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return [];
      }
      // Filter by current user's ID to only show their commissions
      return await commissionService.getCommissionsByUser(user.id);
    },
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes default
    gcTime: options?.gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled: (options?.enabled ?? true) && !!user?.id,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });
};
