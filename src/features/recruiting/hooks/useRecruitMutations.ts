// src/features/recruiting/hooks/useRecruitMutations.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { recruitingService } from "@/services/recruiting";
import type { UpdateRecruitInput } from "@/types/recruiting.types";
import type { CreateRecruitInput } from "@/types/recruiting.types";

export function useCreateRecruit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recruit: CreateRecruitInput) =>
      recruitingService.createRecruit(recruit),
    onSuccess: (data) => {
      const name = `${data.first_name} ${data.last_name}`.trim() || data.email;

      // Simple success message - no email sent at recruit creation
      // Login instructions will be sent when recruit is advanced to phase 2+
      toast.success(`Successfully added ${name} as a prospect.`, {
        duration: 5000,
      });

      queryClient.invalidateQueries({ queryKey: ["recruits"] });
      queryClient.invalidateQueries({ queryKey: ["recruiting-stats"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
    onError: (error: any) => {
      console.error("Failed to create recruit:", error);
      toast.error(error?.message || "Failed to add recruit. Please try again.");
    },
  });
}

export function useUpdateRecruit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateRecruitInput;
    }) => recruitingService.updateRecruit(id, updates),
    onSuccess: (data, variables) => {
      const name = `${data.first_name} ${data.last_name}`.trim() || data.email;
      toast.success(`Successfully updated ${name}`);
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
      queryClient.invalidateQueries({ queryKey: ["recruits", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["recruiting-stats"] });
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- error object type
    onError: (error: any) => {
      console.error("Failed to update recruit:", error);
      toast.error(
        error?.message || "Failed to update recruit. Please try again.",
      );
    },
  });
}

export function useDeleteRecruit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => recruitingService.deleteRecruit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recruits"] });
      queryClient.invalidateQueries({ queryKey: ["recruiting-stats"] });
    },
  });
}

export function useRecruitMutations() {
  const createRecruit = useCreateRecruit();
  const updateRecruit = useUpdateRecruit();
  const deleteRecruit = useDeleteRecruit();

  return {
    createRecruit,
    updateRecruit,
    deleteRecruit,
  };
}
