import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { carrierService } from '@/services/settings/carrierService';
import { toast } from 'sonner';

export interface Carrier {
  id: string;
  name: string;
  short_name?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateCarrierData {
  name: string;
  short_name?: string;
  is_active?: boolean;
}

export interface UpdateCarrierData {
  name?: string;
  short_name?: string;
  is_active?: boolean;
}

export function useCarriers() {
  const queryClient = useQueryClient();

  // Fetch all carriers
  const { data: carriers = [], isLoading, error } = useQuery({
    queryKey: ['carriers'],
    queryFn: async () => {
      const result = await carrierService.getAllCarriers();
      return result.data || [];
    },
  });

  // Create carrier mutation
  const createCarrier = useMutation({
    mutationFn: async (data: CreateCarrierData) => {
      const result = await carrierService.createCarrier({
        ...data,
        is_active: data.is_active ?? true,
      });
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
      toast.success('Carrier created successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create carrier: ${error.message}`);
    },
  });

  // Update carrier mutation
  const updateCarrier = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCarrierData }) => {
      const result = await carrierService.updateCarrier(id, data);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
      toast.success('Carrier updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update carrier: ${error.message}`);
    },
  });

  // Delete carrier mutation
  const deleteCarrier = useMutation({
    mutationFn: async (id: string) => {
      const result = await carrierService.deleteCarrier(id);
      if (result.error) throw new Error(result.error.message);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
      queryClient.invalidateQueries({ queryKey: ['commission-grid'] });
      toast.success('Carrier deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete carrier: ${error.message}`);
    },
  });

  return {
    carriers,
    isLoading,
    error,
    createCarrier,
    updateCarrier,
    deleteCarrier,
  };
}
