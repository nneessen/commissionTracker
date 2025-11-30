// src/hooks/reports/useDrillDown.ts

import { useQuery } from '@tanstack/react-query';
import { DrillDownContext, DrillDownData } from '@/types/reports.types';
import { DrillDownService } from '@/services/reports/drillDownService';

/**
 * Hook to fetch drill-down data based on context
 * Only fetches when context is provided (enabled when context !== null)
 */
export function useDrillDown(context: DrillDownContext | null) {
  return useQuery<DrillDownData, Error>({
    queryKey: [
      'drill-down',
      context?.type,
      context?.agingBucket,
      context?.clientTier,
      context?.carrierId,
      context?.productId,
      context?.filters?.startDate?.toISOString(),
      context?.filters?.endDate?.toISOString(),
    ],
    queryFn: () => {
      if (!context) throw new Error('No context provided');
      return DrillDownService.fetchData(context);
    },
    enabled: !!context,
    staleTime: 1000 * 60 * 2, // 2 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });
}
