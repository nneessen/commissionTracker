// src/hooks/lead-purchases/useLeadPurchases.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { leadPurchaseService } from "@/services/lead-purchases";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import type {
  LeadPurchase,
  CreateLeadPurchaseData,
  UpdateLeadPurchaseData,
  LeadPurchaseFilters,
  LeadPurchaseStats,
  VendorStats,
  VendorStatsAggregate,
  VendorAdminOverview,
  VendorUserBreakdown,
  VendorPolicyTimelineRecord,
  VendorHeatMetrics,
  VendorHeatScore,
  LeadPackRow,
  LeadRecentPolicy,
  PackHeatMetrics,
  HeatScoreV2,
} from "@/types/lead-purchase.types";
import {
  calculateVendorHeatScores,
  calculatePackHeatScores,
  calculateVendorHeatScoresV2,
} from "@/services/analytics";

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
  vendorAdminOverview: () =>
    [...leadPurchaseKeys.all, "vendor-admin-overview"] as const,
  vendorUserBreakdown: () =>
    [...leadPurchaseKeys.all, "vendor-user-breakdown"] as const,
  vendorPolicyTimeline: () =>
    [...leadPurchaseKeys.all, "vendor-policy-timeline"] as const,
  vendorHeatMetrics: () =>
    [...leadPurchaseKeys.all, "vendor-heat-metrics"] as const,
  packList: () => [...leadPurchaseKeys.all, "pack-list"] as const,
  recentPolicies: () => [...leadPurchaseKeys.all, "recent-policies"] as const,
  packHeatMetrics: () =>
    [...leadPurchaseKeys.all, "pack-heat-metrics"] as const,
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
 * Get vendor admin overview - all vendors with full stats for admin tab
 */
export function useLeadVendorAdminOverview(
  startDate?: string,
  endDate?: string,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...leadPurchaseKeys.vendorAdminOverview(), startDate, endDate],
    queryFn: async () => {
      const result = await leadPurchaseService.getVendorAdminOverview(
        startDate,
        endDate,
      );
      if (!result.success) {
        throw result.error;
      }
      return result.data as VendorAdminOverview[];
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: !!user?.id,
  });
}

/**
 * Get per-user breakdown for a specific vendor (loads on-demand)
 */
export function useLeadVendorUserBreakdown(
  vendorId: string | null,
  startDate?: string,
  endDate?: string,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      ...leadPurchaseKeys.vendorUserBreakdown(),
      vendorId,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const result = await leadPurchaseService.getVendorUserBreakdown(
        vendorId!,
        startDate,
        endDate,
      );
      if (!result.success) {
        throw result.error;
      }
      return result.data as VendorUserBreakdown[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user?.id && !!vendorId,
  });
}

/**
 * Get individual policy records for a vendor+agent (on-demand)
 */
export function useLeadVendorPolicyTimeline(
  vendorId: string | null,
  userId: string | null,
  startDate?: string,
  endDate?: string,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [
      ...leadPurchaseKeys.vendorPolicyTimeline(),
      vendorId,
      userId,
      startDate,
      endDate,
    ],
    queryFn: async () => {
      const result = await leadPurchaseService.getVendorPolicyTimeline(
        vendorId!,
        userId || undefined,
        startDate,
        endDate,
      );
      if (!result.success) {
        throw result.error;
      }
      return result.data as VendorPolicyTimelineRecord[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user?.id && !!vendorId && !!userId,
  });
}

/**
 * Fetch weekly activity + compute heat scores client-side
 */
export function useVendorHeatScores() {
  const { user } = useAuth();

  const { data: heatMetrics, isLoading } = useQuery({
    queryKey: leadPurchaseKeys.vendorHeatMetrics(),
    queryFn: async () => {
      const result = await leadPurchaseService.getVendorHeatMetrics();
      if (!result.success) {
        throw result.error;
      }
      return result.data as VendorHeatMetrics[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });

  const heatScores = useMemo(() => {
    if (!heatMetrics || heatMetrics.length === 0)
      return new Map<string, VendorHeatScore>();
    return calculateVendorHeatScores(heatMetrics);
  }, [heatMetrics]);

  return { heatScores, isLoading };
}

/**
 * Fetch pack-level list for admin tables (V2)
 */
export function useLeadPackList(
  freshness?: string,
  startDate?: string,
  endDate?: string,
) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...leadPurchaseKeys.packList(), freshness, startDate, endDate],
    queryFn: async () => {
      const result = await leadPurchaseService.getLeadPackList(
        freshness,
        startDate,
        endDate,
      );
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadPackRow[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user?.id,
  });
}

/**
 * Fetch recent policies from lead packs (V2)
 */
export function useLeadRecentPolicies(limit?: number) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...leadPurchaseKeys.recentPolicies(), limit],
    queryFn: async () => {
      const result = await leadPurchaseService.getLeadRecentPolicies(limit);
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadRecentPolicy[];
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user?.id,
  });
}

/**
 * Fetch pack heat metrics + compute V2 scores client-side
 */
export function usePackHeatScores() {
  const { user } = useAuth();

  const { data: packMetrics, isLoading } = useQuery({
    queryKey: leadPurchaseKeys.packHeatMetrics(),
    queryFn: async () => {
      const result = await leadPurchaseService.getPackHeatMetrics();
      if (!result.success) {
        throw result.error;
      }
      return result.data as PackHeatMetrics[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!user?.id,
  });

  const packScores = useMemo(() => {
    if (!packMetrics || packMetrics.length === 0)
      return new Map<string, HeatScoreV2>();
    return calculatePackHeatScores(packMetrics);
  }, [packMetrics]);

  const vendorScores = useMemo(() => {
    if (!packMetrics || packMetrics.length === 0)
      return new Map<string, HeatScoreV2>();
    return calculateVendorHeatScoresV2(packMetrics);
  }, [packMetrics]);

  return {
    packScores,
    vendorScores,
    packMetrics: packMetrics ?? [],
    isLoading,
  };
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
 * Create a lead purchase and mirrored expense (Expense page > Lead Purchases tab).
 * Kept separate from useCreateLeadPurchase so other flows (e.g. policy lead-source)
 * do not auto-create expense records.
 */
export function useCreateLeadPurchaseWithExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeadPurchaseData) => {
      const result = await leadPurchaseService.createWithExpense(data);
      if (!result.success) {
        throw result.error;
      }
      return result.data as LeadPurchase;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-metrics"] });
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
 * Update a lead purchase and its mirrored expense via atomic RPC.
 * Scoped for the Expense page's Lead Purchases tab.
 */
export function useUpdateLeadPurchaseWithExpenseSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: CreateLeadPurchaseData;
    }) => {
      const leadResult = await leadPurchaseService.updateWithExpense(id, data);
      if (!leadResult.success) {
        throw leadResult.error;
      }

      return leadResult.data as LeadPurchase;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-metrics"] });
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
 * Delete a lead purchase and its mirrored expense via atomic RPC.
 * Scoped for the Expense page's Lead Purchases tab.
 */
export function useDeleteLeadPurchaseWithExpenseSync() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchaseId: string) => {
      const leadResult =
        await leadPurchaseService.deleteWithExpense(purchaseId);
      if (!leadResult.success) {
        throw leadResult.error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadPurchaseKeys.all });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["expense-metrics"] });
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
