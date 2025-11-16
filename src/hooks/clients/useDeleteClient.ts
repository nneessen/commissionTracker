// useDeleteClient.ts - Hook for deleting a client
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '../../services/clients/clientService';
import showToast from '../../utils/toast';

export const useDeleteClient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (clientId: string) => clientService.delete(clientId),

    onSuccess: (_, clientId) => {
      // Invalidate clients list
      queryClient.invalidateQueries({ queryKey: ['clients'] });

      // Remove the specific client from cache
      queryClient.removeQueries({ queryKey: ['client', clientId] });

      // Also invalidate select options
      queryClient.invalidateQueries({ queryKey: ['clients', 'select-options'] });

      showToast.success('Client deleted successfully');
    },

    onError: (error: Error) => {
      console.error('Failed to delete client:', error);

      // Check if error is about existing policies
      if (error.message.includes('existing policies')) {
        showToast.error(
          'Cannot delete client with existing policies. Please delete or reassign policies first.'
        );
      } else {
        showToast.error(error.message || 'Failed to delete client');
      }
    },
  });
};