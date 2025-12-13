import {useMutation, useQueryClient} from '@tanstack/react-query';
import {compGuideService} from '../../services/settings/compGuideService';
import {CreateCompData} from '../../types/commission.types';

export const useCreateComp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newComp: CreateCompData) => {
      const { data, error } = await compGuideService.createEntry(newComp);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comps'] });
    }
  });
};
