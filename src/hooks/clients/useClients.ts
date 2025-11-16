// useClients.ts - Hook for fetching all clients with optional filters and stats
import { useQuery } from '@tanstack/react-query';
import { clientService } from '../../services/clients/clientService';
import type { ClientFilters, ClientSortConfig } from '../../types/client.types';

export interface UseClientsOptions {
  filters?: ClientFilters;
  sort?: ClientSortConfig;
  withStats?: boolean;
  enabled?: boolean;
  staleTime?: number;
  gcTime?: number;
}

export const useClients = (options?: UseClientsOptions) => {
  const {
    filters,
    sort,
    withStats = false,
    enabled = true,
    staleTime,
    gcTime
  } = options || {};

  return useQuery({
    queryKey: ['clients', { filters, sort, withStats }],
    queryFn: async () => {
      if (withStats) {
        return await clientService.getAllWithStats(filters);
      }
      return await clientService.getAll(filters, sort);
    },
    staleTime: staleTime ?? 5 * 60 * 1000,  // 5 minutes default
    gcTime: gcTime ?? 10 * 60 * 1000,        // 10 minutes default
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};