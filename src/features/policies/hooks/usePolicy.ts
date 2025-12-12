// src/features/policies/hooks/usePolicy.ts
// Hook for fetching a single policy by ID

import {useQuery} from '@tanstack/react-query';
import {policyQueries} from '../queries';

/**
 * Fetch a single policy by ID
 *
 * @param id - Policy UUID (or undefined to disable query)
 * @returns TanStack Query result with policy data
 *
 * @example
 * const { data: policy, isLoading } = usePolicy(policyId);
 */
export function usePolicy(id: string | undefined) {
  return useQuery({
    ...policyQueries.detail(id!),
    enabled: !!id,
  });
}
