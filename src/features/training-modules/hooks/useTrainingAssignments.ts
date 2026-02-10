// src/features/training-modules/hooks/useTrainingAssignments.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingAssignmentService } from "../services/trainingAssignmentService";
import type { CreateAssignmentInput } from "../types/training-module.types";
import { useAuth } from "@/contexts/AuthContext";
import { useImo } from "@/contexts/ImoContext";
import { toast } from "sonner";

export const assignmentKeys = {
  all: ["training-assignments"] as const,
  byModule: (moduleId: string) =>
    [...assignmentKeys.all, "module", moduleId] as const,
  mine: (userId: string) => [...assignmentKeys.all, "mine", userId] as const,
};

export function useTrainingAssignments(moduleId: string | undefined) {
  return useQuery({
    queryKey: assignmentKeys.byModule(moduleId!),
    queryFn: () => trainingAssignmentService.listByModule(moduleId!),
    enabled: !!moduleId,
  });
}

export function useMyTrainingAssignments() {
  const { user } = useAuth();

  return useQuery({
    queryKey: assignmentKeys.mine(user?.id || ""),
    queryFn: () => trainingAssignmentService.listMyAssignments(user!.id!),
    enabled: !!user?.id,
  });
}

export function useCreateTrainingAssignment() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { imo } = useImo();

  return useMutation({
    mutationFn: ({
      input,
      moduleVersion,
    }: {
      input: CreateAssignmentInput;
      moduleVersion: number;
    }) => {
      if (!user?.id || !imo?.id) throw new Error("Not authenticated");
      return trainingAssignmentService.create(
        input,
        user.id,
        imo.id,
        moduleVersion,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      toast.success("Assignment created");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useRevokeTrainingAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => trainingAssignmentService.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.all });
      toast.success("Assignment revoked");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
