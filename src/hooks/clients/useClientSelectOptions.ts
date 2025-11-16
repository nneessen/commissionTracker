// useClientSelectOptions.ts - Hook for fetching client options for select dropdowns
import { useQuery } from '@tanstack/react-query';
import { clientService } from '../../services/clients/clientService';

interface UseClientSelectOptionsParams {
  includeStats?: boolean;
  enabled?: boolean;
}

export const useClientSelectOptions = (params?: UseClientSelectOptionsParams) => {
  const { includeStats = false, enabled = true } = params || {};

  return useQuery({
    queryKey: ['clients', 'select-options', { includeStats }],
    queryFn: () => clientService.getSelectOptions(includeStats),
    staleTime: 10 * 60 * 1000,   // 10 minutes (select options don't change often)
    gcTime: 15 * 60 * 1000,       // 15 minutes
    enabled,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};