// src/hooks/clients/useDownlineClients.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { clientService } from "@/services/clients/client";
import { supabase } from "@/services/base/supabase";
import type {
  ClientFilters,
  DownlineClientWithStats,
} from "@/types/client.types";
import { useCallback } from "react";

/**
 * Query keys for client hierarchy queries
 */
export const clientHierarchyKeys = {
  all: ["clients", "hierarchy"] as const,
  downline: () => [...clientHierarchyKeys.all, "downline"] as const,
  downlineWithFilters: (filters?: ClientFilters) =>
    [...clientHierarchyKeys.downline(), filters] as const,
  imo: () => [...clientHierarchyKeys.all, "imo"] as const,
  imoWithFilters: (filters?: ClientFilters) =>
    [...clientHierarchyKeys.imo(), filters] as const,
  hasDownlines: () => [...clientHierarchyKeys.all, "has-downlines"] as const,
  isImoAdmin: () => [...clientHierarchyKeys.all, "is-imo-admin"] as const,
};

/**
 * Hook to check if current user is an IMO admin
 * Uses database function for authoritative check
 */
export function useIsImoAdmin() {
  return useQuery<boolean, Error>({
    queryKey: clientHierarchyKeys.isImoAdmin(),
    queryFn: async () => {
      const { data, error } = await supabase.rpc("check_is_imo_admin");
      if (error) {
        console.error("Failed to check IMO admin status:", error);
        return false;
      }
      return data === true;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - role rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

/**
 * Hook to fetch clients from the current user's downlines
 * Returns clients belonging to agents in the hierarchy below the current user
 */
export function useDownlineClients(
  filters?: ClientFilters,
  options?: { enabled?: boolean }
) {
  return useQuery<DownlineClientWithStats[], Error>({
    queryKey: clientHierarchyKeys.downlineWithFilters(filters),
    queryFn: async () => {
      const result = await clientService.getDownlineClientsWithStats(filters);
      if (!result.success) {
        throw result.error || new Error("Failed to fetch downline clients");
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook to fetch all clients in the user's IMO
 * Only accessible by IMO admins - requires isImoAdmin check
 *
 * @param filters - Optional filters to apply
 * @param options.enabled - Whether to enable the query (default: true)
 * @param options.isImoAdmin - REQUIRED: Pass the result of useIsImoAdmin().data
 *                             Query will not run unless this is true
 */
export function useImoClients(
  filters?: ClientFilters,
  options?: { enabled?: boolean; isImoAdmin?: boolean }
) {
  // Guard: Don't make request if user is not IMO admin
  const shouldFetch =
    options?.enabled !== false && options?.isImoAdmin === true;

  return useQuery<DownlineClientWithStats[], Error>({
    queryKey: clientHierarchyKeys.imoWithFilters(filters),
    queryFn: async () => {
      const result = await clientService.getImoClientsWithStats(filters);
      if (!result.success) {
        throw result.error || new Error("Failed to fetch IMO clients");
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
    enabled: shouldFetch,
  });
}

/**
 * Hook to check if the current user has any downlines
 * Useful for conditionally showing team view options
 */
export function useHasDownlines() {
  return useQuery<boolean, Error>({
    queryKey: clientHierarchyKeys.hasDownlines(),
    queryFn: async () => {
      const result = await clientService.hasDownlines();
      if (!result.success) {
        throw result.error || new Error("Failed to check downlines");
      }
      return result.data ?? false;
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - this rarely changes
    gcTime: 30 * 60 * 1000, // 30 minutes cache
  });
}

/**
 * Hook to get cache invalidation functions for client hierarchy queries
 * Use when hierarchy changes, clients are added/removed, or agency assignments change
 */
export function useInvalidateClientHierarchy() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: clientHierarchyKeys.all });
  }, [queryClient]);

  const invalidateDownline = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: clientHierarchyKeys.downline() });
  }, [queryClient]);

  const invalidateImo = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: clientHierarchyKeys.imo() });
  }, [queryClient]);

  const invalidateHasDownlines = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: clientHierarchyKeys.hasDownlines(),
    });
  }, [queryClient]);

  return {
    invalidateAll,
    invalidateDownline,
    invalidateImo,
    invalidateHasDownlines,
  };
}
