// src/hooks/carriers/useUpdateCarrier.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carrierService } from "../../services/settings/carriers";
import { NewCarrierForm } from "../../types/carrier.types";

export const useUpdateCarrier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<NewCarrierForm>;
    }) => {
      const result = await carrierService.updateFromForm(id, updates);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carriers"] });
    },
  });
};
