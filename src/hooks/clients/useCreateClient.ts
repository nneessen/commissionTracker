// useCreateClient.ts - Hook for creating a new client
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../../services/clients/clientService';
import showToast from '../../utils/toast';
import type { CreateClientData } from '../../types/client.types';

export const useCreateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateClientData) => clientService.create(data),
    onSuccess: (newClient) => {
      // Invalidate and refetch clients lists
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      // Also invalidate select options
      queryClient.invalidateQueries({ queryKey: ['clients', 'select-options'] });

      showToast.success(`Client "${newClient.name}" created successfully`);
    },
    onError: (error: Error) => {
      console.error('Failed to create client:', error);
      showToast.error(error.message || 'Failed to create client');
    },
  });
};