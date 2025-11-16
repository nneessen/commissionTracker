// useClientWithPolicies.ts - Hook for fetching a client with all their policies
import { useQuery } from '@tanstack/react-query';
import { clientService } from '../../services/clients/clientService';

export const useClientWithPolicies = (clientId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ['client', clientId, 'policies'],
    queryFn: () => clientService.getWithPolicies(clientId!),
    staleTime: 2 * 60 * 1000,    // 2 minutes (fresher data for detailed view)
    gcTime: 5 * 60 * 1000,        // 5 minutes
    enabled: enabled && !!clientId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};