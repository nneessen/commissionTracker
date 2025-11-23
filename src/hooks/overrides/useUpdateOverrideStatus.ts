// src/hooks/overrides/useUpdateOverrideStatus.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { overrideService } from '../../services/overrides/overrideService';

export type OverrideStatus = 'pending' | 'earned' | 'paid' | 'chargedback';

/**
 * Update override commission status (admin only)
 * Allows admin to manually update override status for corrections or adjustments
 *
 * @returns TanStack mutation hook for updating override status
 */
export const useUpdateOverrideStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OverrideStatus }) => {
      return overrideService.updateOverrideStatus(id, status);
    },
    onSuccess: () => {
      // Invalidate all override queries
      queryClient.invalidateQueries({ queryKey: ['overrides'] });
      // Invalidate hierarchy stats since they include override totals
      queryClient.invalidateQueries({ queryKey: ['hierarchy', 'stats'] });
    },
  });
};
