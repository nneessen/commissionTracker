// useClient.ts - Hook for fetching a single client by ID
import { useQuery } from '@tanstack/react-query';
import { clientService } from '../../services/clients/clientService';

export const useClient = (clientId: string | undefined, enabled = true) => {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientService.getById(clientId!),
    staleTime: 5 * 60 * 1000,    // 5 minutes
    gcTime: 10 * 60 * 1000,       // 10 minutes
    enabled: enabled && !!clientId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};