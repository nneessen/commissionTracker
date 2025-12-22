// src/hooks/expenses/useTeamExpenses.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { expenseService } from "@/services/expenses/expense";
import type {
  DownlineExpense,
  AgentExpenseSummary,
  CategoryExpenseSummary,
  ExpenseDateRange,
} from "@/types/expense.types";
import { useCallback } from "react";

/**
 * Query keys for team expense queries
 */
export const teamExpenseKeys = {
  all: ["expenses", "team"] as const,
  downline: () => [...teamExpenseKeys.all, "downline"] as const,
  downlineWithRange: (range?: ExpenseDateRange) =>
    [...teamExpenseKeys.downline(), range] as const,
  downlineSummary: () => [...teamExpenseKeys.all, "downline-summary"] as const,
  downlineSummaryWithRange: (range?: ExpenseDateRange) =>
    [...teamExpenseKeys.downlineSummary(), range] as const,
  imo: () => [...teamExpenseKeys.all, "imo"] as const,
  imoSummary: () => [...teamExpenseKeys.imo(), "summary"] as const,
  imoSummaryWithRange: (range?: ExpenseDateRange) =>
    [...teamExpenseKeys.imoSummary(), range] as const,
  imoByCategory: () => [...teamExpenseKeys.imo(), "by-category"] as const,
  imoByCategoryWithRange: (range?: ExpenseDateRange) =>
    [...teamExpenseKeys.imoByCategory(), range] as const,
};

/**
 * Hook to fetch expenses from downline agents
 */
export function useDownlineExpenses(
  dateRange?: ExpenseDateRange,
  options?: { enabled?: boolean }
) {
  return useQuery<DownlineExpense[], Error>({
    queryKey: teamExpenseKeys.downlineWithRange(dateRange),
    queryFn: async () => {
      const result = await expenseService.getDownlineExpenses(dateRange);
      if (!result.success) {
        throw result.error || new Error("Failed to fetch downline expenses");
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook to fetch expense summary by downline agent
 */
export function useDownlineExpenseSummary(
  dateRange?: ExpenseDateRange,
  options?: { enabled?: boolean }
) {
  return useQuery<AgentExpenseSummary[], Error>({
    queryKey: teamExpenseKeys.downlineSummaryWithRange(dateRange),
    queryFn: async () => {
      const result = await expenseService.getDownlineExpenseSummary(dateRange);
      if (!result.success) {
        throw (
          result.error || new Error("Failed to fetch downline expense summary")
        );
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled !== false,
  });
}

/**
 * Hook to fetch IMO expense summary (admin only)
 * @param options.isImoAdmin - REQUIRED: Pass the result of useIsImoAdmin().data
 */
export function useImoExpenseSummary(
  dateRange?: ExpenseDateRange,
  options?: { enabled?: boolean; isImoAdmin?: boolean }
) {
  const shouldFetch =
    options?.enabled !== false && options?.isImoAdmin === true;

  return useQuery<AgentExpenseSummary[], Error>({
    queryKey: teamExpenseKeys.imoSummaryWithRange(dateRange),
    queryFn: async () => {
      const result = await expenseService.getImoExpenseSummary(dateRange);
      if (!result.success) {
        throw result.error || new Error("Failed to fetch IMO expense summary");
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: shouldFetch,
  });
}

/**
 * Hook to fetch IMO expense breakdown by category (admin only)
 * @param options.isImoAdmin - REQUIRED: Pass the result of useIsImoAdmin().data
 */
export function useImoExpenseByCategory(
  dateRange?: ExpenseDateRange,
  options?: { enabled?: boolean; isImoAdmin?: boolean }
) {
  const shouldFetch =
    options?.enabled !== false && options?.isImoAdmin === true;

  return useQuery<CategoryExpenseSummary[], Error>({
    queryKey: teamExpenseKeys.imoByCategoryWithRange(dateRange),
    queryFn: async () => {
      const result = await expenseService.getImoExpenseByCategory(dateRange);
      if (!result.success) {
        throw (
          result.error || new Error("Failed to fetch IMO expense by category")
        );
      }
      return result.data || [];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: shouldFetch,
  });
}

/**
 * Hook to get cache invalidation functions for team expense queries
 */
export function useInvalidateTeamExpenses() {
  const queryClient = useQueryClient();

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: teamExpenseKeys.all });
  }, [queryClient]);

  const invalidateDownline = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: teamExpenseKeys.downline() });
    queryClient.invalidateQueries({
      queryKey: teamExpenseKeys.downlineSummary(),
    });
  }, [queryClient]);

  const invalidateImo = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: teamExpenseKeys.imo() });
  }, [queryClient]);

  return {
    invalidateAll,
    invalidateDownline,
    invalidateImo,
  };
}
