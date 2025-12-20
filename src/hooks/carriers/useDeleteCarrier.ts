// src/hooks/carriers/useDeleteCarrier.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carrierService } from "../../services/settings/carriers";

export const useDeleteCarrier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await carrierService.delete(id);
      if (!result.success) throw result.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carriers"] });
    },
  });
};
