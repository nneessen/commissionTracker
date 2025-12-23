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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- internal response metadata
      const emailSent = (data as any)._emailSent;

      if (emailSent) {
        toast.success(
          `Successfully added ${name}. A password reset email has been sent to ${data.email}. They should check their inbox (and spam folder) for login instructions.`,
          { duration: 8000 },
        );
      } else {
        toast.warning(
          `Added ${name} but the invite email could not be sent. Use the "Resend Invite" button in their profile to send login instructions.`,
          { duration: 8000 },
        );
      }

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
