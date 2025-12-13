import {useMutation, useQueryClient} from '@tanstack/react-query';
import {compGuideService} from '../../services/settings/compGuideService';
import {UpdateCompData} from '../../types/commission.types';

export const useUpdateComp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCompData }) => {
      const { data: updated, error } = await compGuideService.updateEntry(id, data);
      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comps'] });
    }
  });
};
