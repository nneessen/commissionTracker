// /home/nneessen/projects/commissionTracker/src/hooks/compGuide/useCompGuide.ts
// React Query hooks for Commission Guide data

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  compGuideService,
  CompGuideFilters,
  CompGuidePaginationOptions,
  CompGuideQueryResult
} from '../../services/compGuide/compGuideService';

// Query keys for React Query cache management
export const compGuideQueryKeys = {
  all: ['compGuide'] as const,
  lists: () => [...compGuideQueryKeys.all, 'list'] as const,
  list: (filters: CompGuideFilters, pagination: CompGuidePaginationOptions) =>
    [...compGuideQueryKeys.lists(), { filters, pagination }] as const,
  carriers: () => [...compGuideQueryKeys.all, 'carriers'] as const,
  productTypes: () => [...compGuideQueryKeys.all, 'productTypes'] as const,
  commissionRate: (carrierName: string, productType: string, contractLevel: number) =>
    [...compGuideQueryKeys.all, 'commissionRate', { carrierName, productType, contractLevel }] as const,
  statistics: () => [...compGuideQueryKeys.all, 'statistics'] as const,
  export: (filters: CompGuideFilters) =>
    [...compGuideQueryKeys.all, 'export', filters] as const,
};

/**
 * Hook to fetch paginated commission guide data with filtering and search
 */
export function useCompGuideData(
  filters: CompGuideFilters = {},
  pagination: CompGuidePaginationOptions = {},
  options: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  } = {}
) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus = false
  } = options;

  return useQuery({
    queryKey: compGuideQueryKeys.list(filters, pagination),
    queryFn: () => compGuideService.getCompGuideData(filters, pagination),
    enabled,
    staleTime,
    refetchOnWindowFocus,
    // Keep previous data while loading new data for smooth pagination
    placeholderData: (previousData: any) => previousData,
  });
}

/**
 * Hook to fetch carrier names for filtering
 */
export function useCarrierNames(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: compGuideQueryKeys.carriers(),
    queryFn: () => compGuideService.getCarrierNames(),
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes - carriers don't change often
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch product types for filtering
 */
export function useProductTypes(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: compGuideQueryKeys.productTypes(),
    queryFn: () => compGuideService.getProductTypes(),
    enabled,
    staleTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get commission rate for specific criteria
 */
export function useCommissionRate(
  carrierName: string,
  productType: string,
  contractLevel: number,
  options: { enabled?: boolean } = {}
) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: compGuideQueryKeys.commissionRate(carrierName, productType, contractLevel),
    queryFn: () => compGuideService.getCommissionRate(carrierName, productType, contractLevel),
    enabled: enabled && Boolean(carrierName && productType && contractLevel),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to export commission guide data
 */
export function useCompGuideExport(
  filters: CompGuideFilters = {},
  options: { enabled?: boolean } = {}
) {
  const { enabled = false } = options; // Default disabled until user triggers export

  return useQuery({
    queryKey: compGuideQueryKeys.export(filters),
    queryFn: () => compGuideService.exportAllData(filters),
    enabled,
    staleTime: 0, // Always fresh for exports
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to get commission guide statistics
 */
export function useCompGuideStatistics(options: { enabled?: boolean } = {}) {
  const { enabled = true } = options;

  return useQuery({
    queryKey: compGuideQueryKeys.statistics(),
    queryFn: () => compGuideService.getStatistics(),
    enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to prefetch commission guide data for improved UX
 */
export function usePrefetchCompGuideData() {
  const queryClient = useQueryClient();

  const prefetchPage = (
    filters: CompGuideFilters,
    pagination: CompGuidePaginationOptions
  ) => {
    queryClient.prefetchQuery({
      queryKey: compGuideQueryKeys.list(filters, pagination),
      queryFn: () => compGuideService.getCompGuideData(filters, pagination),
      staleTime: 5 * 60 * 1000,
    });
  };

  return { prefetchPage };
}

/**
 * Hook to invalidate and refresh commission guide cache
 */
export function useRefreshCompGuide() {
  const queryClient = useQueryClient();

  const refreshAll = () => {
    queryClient.invalidateQueries({
      queryKey: compGuideQueryKeys.all,
    });
  };

  const refreshList = () => {
    queryClient.invalidateQueries({
      queryKey: compGuideQueryKeys.lists(),
    });
  };

  const refreshCarriers = () => {
    queryClient.invalidateQueries({
      queryKey: compGuideQueryKeys.carriers(),
    });
  };

  const refreshProductTypes = () => {
    queryClient.invalidateQueries({
      queryKey: compGuideQueryKeys.productTypes(),
    });
  };

  return {
    refreshAll,
    refreshList,
    refreshCarriers,
    refreshProductTypes,
  };
}

/**
 * Hook for optimistic updates (future enhancement)
 */
export function useCompGuideOptimisticUpdates() {
  const queryClient = useQueryClient();

  // Placeholder for future commission guide editing functionality
  const updateCommissionRate = useMutation({
    mutationFn: async (params: {
      id: string;
      commissionPercentage: number;
    }) => {
      // Future implementation for updating commission rates
      throw new Error('Commission rate updates not yet implemented');
    },
    onMutate: async (newData: any) => {
      // Optimistic update implementation would go here
      return { previousData: undefined };
    },
    onError: (err: any, newData: any, context: any) => {
      // Rollback optimistic update on error
      if (context?.previousData) {
        // Restore previous data
      }
    },
    onSettled: () => {
      // Refetch to ensure data consistency
      queryClient.invalidateQueries({
        queryKey: compGuideQueryKeys.all,
      });
    },
  });

  return {
    updateCommissionRate,
  };
}