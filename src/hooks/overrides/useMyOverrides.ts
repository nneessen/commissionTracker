// src/hooks/overrides/useMyOverrides.ts

import {useQuery} from '@tanstack/react-query';
import {overrideService} from '../../services/overrides/overrideService';
import {OverrideFilters} from '../../types/hierarchy.types';

export interface UseMyOverridesOptions {
  filters?: OverrideFilters;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

/**
 * Fetch override commissions earned by the current user
 * Supports filtering by status, downline, date range, and amount
 * Overrides are automatically calculated when downlines write policies
 *
 * @param options Optional configuration including filters and query options
 * @returns TanStack Query result with override commissions data
 */
export const useMyOverrides = (options?: UseMyOverridesOptions) => {
  const { filters, enabled = true, staleTime, gcTime } = options || {};

  return useQuery({
    queryKey: ['overrides', 'my', filters],
    queryFn: () => overrideService.getMyOverrides(filters),
    staleTime: staleTime ?? 3 * 60 * 1000, // 3 minutes - overrides change when policies are added
    gcTime: gcTime ?? 10 * 60 * 1000, // 10 minutes garbage collection
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};
