// src/hooks/carriers/useCreateCarrier.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { carrierService } from "../../services/settings/carriers";
import { NewCarrierForm } from "../../types/carrier.types";

export const useCreateCarrier = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newCarrier: NewCarrierForm) => {
      const result = await carrierService.createFromForm(newCarrier);
      if (!result.success) throw result.error;
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["carriers"] });
    },
  });
};
