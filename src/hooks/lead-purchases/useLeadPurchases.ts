// src/hooks/lead-purchases/useLeadPurchases.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadPurchaseService } from "@/services/lead-purchases";
import { useAuth } from "@/contexts/AuthContext";
import type {
  LeadPurchase,
  CreateLeadPurchaseData,
  UpdateLeadPurchaseData,
  LeadPurchaseFilters,
  LeadPurchaseStats,
  VendorStats,
  VendorStatsAggregate,
} from "@/types/lead-purchase.types";

// Query keys
export const leadPurchaseKeys = {
  all: ["lead-purchases"] as const,
  lists: () => [...leadPurchaseKeys.all, "list"] as const,
  list: (filters?: LeadPurchaseFilters) =>
    [...leadPurchaseKeys.lists(), filters] as const,
  details: () => [...leadPurchaseKeys.all, "detail"] as const,
  detail: (id: string) => [...leadPurchaseKeys.details(), id] as const,
  stats: () => [...leadPurchaseKeys.all, "stats"] as const,
  statsByVendor: () => [...leadPurchaseKeys.all, "stats-by-vendor"] as const,
  statsByVendorAggregate: () =>
    [...leadPurchaseKeys.all, "stats-by-vendor-aggregate"] as const,
};

/**
 * Fetch all lead purchases with optional filters
 */
export function useLeadPurchases(filters?: LeadPurchaseFilters) {
  const { user } = useAuth();

  return useQuery({
    queryKey: leadPurchaseKeys.list(filters),
    queryFn: async () => {
      const result = await leadPurchaseService.getAllWithFilters(filters);
      if (!result.success) {
        throw result.error;
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!user?.id,
  });
}

/**
 * Get a single lead purchase by ID with vendor data
 */
export function useLeadPurchase(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: leadPurchaseKeys.detail(id),
    queryFn: async () => {
      const result = await leadPurchaseService.getByIdWithVendor(id);
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id && !!id,
  });
}

/**
 * Get lead purchase linked to an expense
 */
export function useLeadPurchaseByExpense(expenseId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...leadPurchaseKeys.all, "by-expense", expenseId],
    queryFn: async () => {
      if (!expenseId) return null;
      const result = await leadPurchaseService.getByExpenseId(expenseId);
      if (!result.success) {
        throw result.error;
      }
      return result.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id && !!expenseId,
  });
}

/**
 * Get aggregate stats for all lead purchases
 */
export function useLeadPurchaseStats(startDate?: string, endDate?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...leadPurchaseKeys.stats(), startDate, endDate],
    queryFn: async () => {
      const result = await leadPurchaseService.getStats(startDate, endDate);
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadPurchaseStats;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });
}

/**
 * Get stats grouped by vendor
 */
export function useLeadStatsByVendor(startDate?: string, endDate?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...leadPurchaseKeys.statsByVendor(), startDate, endDate],
    queryFn: async () => {
      const result = await leadPurchaseService.getStatsByVendor(
        startDate,
        endDate,
      );
      if (!result.success) {
        throw result.error;
      }
      return result.data as VendorStats[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });
}

/**
 * Get stats grouped by vendor - aggregated across ALL users in the IMO
 */
export function useLeadStatsByVendorAggregate(
  startDate?: string,
  endDate?: string,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      ...leadPurchaseKeys.statsByVendorAggregate(),
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const result = await leadPurchaseService.getStatsByVendorImoAggregate(
        startDate,
        endDate,
      );
      if (!result.success) {
        throw result.error;
      }
      return result.data as VendorStatsAggregate[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });
}

/**
 * Create a new lead purchase
 */
export function useCreateLeadPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeadPurchaseData) => {
      const result = await leadPurchaseService.create(data);
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadPurchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.all });
    },
  });
}

/**
 * Update a lead purchase
 */
export function useUpdateLeadPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateLeadPurchaseData;
    }) => {
      const result = await leadPurchaseService.update(id, data);
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadPurchase;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.detail(id) });
    },
  });
}

/**
 * Update ROI fields (policies sold, commission earned)
 */
export function useUpdateLeadPurchaseRoi() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      policiesSold,
      commissionEarned,
    }: {
      id: string;
      policiesSold: number;
      commissionEarned: number;
    }) => {
      const result = await leadPurchaseService.updateRoi(
        id,
        policiesSold,
        commissionEarned,
      );
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadPurchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.all });
    },
  });
}

/**
 * Delete a lead purchase
 */
export function useDeleteLeadPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await leadPurchaseService.delete(id);
      if (!result.success) {
        throw result.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.all });
    },
  });
}

/**
 * Link a lead purchase to an expense
 */
export function useLinkLeadPurchaseToExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      purchaseId,
      expenseId,
    }: {
      purchaseId: string;
      expenseId: string;
    }) => {
      const result = await leadPurchaseService.linkToExpense(
        purchaseId,
        expenseId,
      );
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadPurchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.all });
    },
  });
}
