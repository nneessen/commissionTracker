// src/hooks/underwriting/useCreateCriteria.ts
// Mutation hook for manually creating underwriting criteria

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { criteriaService, type CreateCriteriaInput } from "@/services/underwriting";

// Query keys for criteria - matches the pattern from useCriteria
const criteriaQueryKeys = {
  all: ["criteria"] as const,
};

/**
 * Mutation hook to manually create criteria (without AI extraction)
 */
export function useCreateCriteria() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateCriteriaInput) => {
      return criteriaService.createCriteria(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: criteriaQueryKeys.all });
      toast.success("Criteria created successfully", {
        description: "The criteria has been created and is active.",
      });
    },
    onError: (error) => {
      toast.error("Failed to create criteria", {
        description: error.message,
      });
    },
  });
}
