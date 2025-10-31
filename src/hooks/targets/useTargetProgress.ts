// src/hooks/targets/useTargetProgress.ts

import { useQuery } from '@tanstack/react-query';
import { targetsService } from '../../services/targets';
import { supabase } from '../../services/base/supabase';
import type { AllTargetsProgress, ActualMetrics, TimePeriod } from '../../types/targets.types';

export interface UseTargetProgressOptions {
  actuals: ActualMetrics;
  enabled?: boolean;
  staleTime?: number;
}

/**
 * Calculate target progress using TanStack Query
 *
 * This hook combines user targets with actual metrics to calculate progress
 *
 * @param options Options including actual metrics data
 * @returns TanStack Query result with progress calculations
 */
export const useTargetProgress = (options: UseTargetProgressOptions) => {
  return useQuery({
    queryKey: ['targetProgress', options.actuals],
    queryFn: async (): Promise<AllTargetsProgress> => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user targets
      const targets = await targetsService.getUserTargets(user.id);

      // Calculate progress
      const progress = targetsService.calculateAllProgress(targets, options.actuals);

      // Check for new milestones
      await targetsService.checkMilestones(user.id, progress);

      return progress;
    },
    staleTime: options?.staleTime ?? 1 * 60 * 1000, // 1 minute default (progress changes frequently)
    enabled: options?.enabled ?? true,
  });
};
