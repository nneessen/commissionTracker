// src/hooks/expenses/useConstants.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logger } from '../../services/base/logger';
import { Constants } from '../../types/expense.types';
import { constantsService } from '../../services';

const DEFAULT_CONSTANTS: Constants = {
  avgAP: 15000,
  commissionRate: 0.2,
  target1: 4000,
  target2: 6500,
};

export type UseConstantsResult = ReturnType<typeof useConstants>;

/**
 * Hook to fetch and manage constants using TanStack Query
 * Returns standard TanStack Query result with data property
 */
export function useConstants() {
  return useQuery({
    queryKey: ['constants'],
    queryFn: async () => {
      try {
        const data = await constantsService.getAll();
        return data;
      } catch (err) {
        logger.error('Error loading constants', err instanceof Error ? err : String(err), 'Migration');
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: DEFAULT_CONSTANTS, // Use default constants while loading
  });
}

/**
 * Mutation hook to update a single constant
 */
export function useUpdateConstant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ field, value }: { field: keyof Constants; value: number }) => {
      // Validate value
      if (value < 0) {
        throw new Error(`${field} cannot be negative`);
      }

      if (field === 'commissionRate' && (value < 0 || value > 1)) {
        throw new Error('Commission rate must be between 0 and 1');
      }

      await constantsService.setValue(String(field), value);
      return { field, value };
    },
    onSuccess: (data) => {
      // Optimistically update the cache
      queryClient.setQueryData(['constants'], (old: Constants | undefined) => {
        if (!old) return DEFAULT_CONSTANTS;
        return {
          ...old,
          [data.field]: data.value,
        };
      });
    },
    onError: (err) => {
      logger.error('Error updating constant', err instanceof Error ? err : String(err), 'Migration');
    },
  });
}

/**
 * Mutation hook to reset all constants to defaults
 */
export function useResetConstants() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const updatedConstants = await constantsService.updateMultiple(
        Object.entries(DEFAULT_CONSTANTS).map(([key, value]) => ({ key: String(key), value }))
      );
      return updatedConstants;
    },
    onSuccess: (data) => {
      // Update the cache with the reset constants
      queryClient.setQueryData(['constants'], data);
    },
    onError: (err) => {
      logger.error('Error resetting constants', err instanceof Error ? err : String(err), 'Migration');
    },
  });
}
