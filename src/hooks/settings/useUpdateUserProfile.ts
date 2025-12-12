// src/hooks/settings/useUpdateUserProfile.ts
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {userService} from '../../services/settings/userService';
import {UpdateUserData} from '../../types/user.types';

/**
 * Hook for updating the current user's profile
 * Uses TanStack Query for mutation management
 */
export function useUpdateUserProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<UpdateUserData>) => {
      const result = await userService.updateCurrentUserProfile(updates);
      if (!result) {
        throw new Error('Failed to update user profile');
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate any user-related queries to refetch with new data
      queryClient.invalidateQueries({ queryKey: ['user'] });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
    onError: (error) => {
      console.error('Error updating user profile:', error);
    },
  });
}
