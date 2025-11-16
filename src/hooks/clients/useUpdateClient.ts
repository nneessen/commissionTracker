// useUpdateClient.ts - Hook for updating an existing client
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../../services/clients/clientService';
import showToast from '../../utils/toast';
import type { UpdateClientData, Client } from '../../types/client.types';

interface UpdateClientParams {
  id: string;
  data: UpdateClientData;
}

export const useUpdateClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateClientParams) =>
      clientService.update(id, data),

    onMutate: async ({ id, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['client', id] });

      // Snapshot the previous value
      const previousClient = queryClient.getQueryData<Client>(['client', id]);

      // Optimistically update to the new value
      if (previousClient) {
        queryClient.setQueryData<Client>(['client', id], {
          ...previousClient,
          ...data,
        });
      }

      // Return a context object with the snapshotted value
      return { previousClient, id };
    },

    onSuccess: (updatedClient) => {
      // Invalidate specific client and lists
      queryClient.invalidateQueries({ queryKey: ['client', updatedClient.id] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['clients', 'select-options'] });

      showToast.success(`Client "${updatedClient.name}" updated successfully`);
    },

    onError: (error: Error, { id }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousClient) {
        queryClient.setQueryData(['client', id], context.previousClient);
      }

      console.error('Failed to update client:', error);
      showToast.error(error.message || 'Failed to update client');
    },

    // Always refetch after error or success
    onSettled: (_, __, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['client', id] });
    },
  });
};