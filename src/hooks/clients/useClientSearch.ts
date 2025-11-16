// useClientSearch.ts - Hook for searching clients (autocomplete)
import { useQuery } from '@tanstack/react-query';
import { clientService } from '../../services/clients/clientService';

interface UseClientSearchParams {
  query: string;
  limit?: number;
  enabled?: boolean;
}

export const useClientSearch = ({ query, limit = 10, enabled = true }: UseClientSearchParams) => {
  return useQuery({
    queryKey: ['clients', 'search', { query, limit }],
    queryFn: () => clientService.search(query, limit),
    staleTime: 30 * 1000,         // 30 seconds (search results are more volatile)
    gcTime: 60 * 1000,            // 1 minute
    enabled: enabled && query.length >= 2,
    retry: 1,  // Less retries for search
  });
};