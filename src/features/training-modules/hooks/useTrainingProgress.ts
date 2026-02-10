// src/features/training-modules/hooks/useTrainingProgress.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingProgressService } from "../services/trainingProgressService";
import { useAuth } from "@/contexts/AuthContext";
import { useImo } from "@/contexts/ImoContext";
import { toast } from "sonner";
import { trainingModuleKeys } from "./useTrainingModules";

export const trainingProgressKeys = {
  all: ["training-progress"] as const,
  byModule: (moduleId: string, userId: string) =>
    [...trainingProgressKeys.all, moduleId, userId] as const,
  summary: (moduleId: string, userId?: string) =>
    [...trainingProgressKeys.all, "summary", moduleId, userId] as const,
};

export function useTrainingProgress(moduleId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: trainingProgressKeys.byModule(moduleId!, user?.id || ""),
    queryFn: () => trainingProgressService.getByModule(moduleId!, user!.id!),
    enabled: !!moduleId && !!user?.id,
  });
}

export function useModuleProgressSummary(
  moduleId: string | undefined,
  userId?: string,
) {
  return useQuery({
    queryKey: trainingProgressKeys.summary(moduleId!, userId),
    queryFn: () =>
      trainingProgressService.getModuleProgressSummary(moduleId!, userId),
    enabled: !!moduleId,
  });
}

export function useStartLesson() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { imo, agency } = useImo();

  return useMutation({
    mutationFn: ({
      lessonId,
      moduleId,
    }: {
      lessonId: string;
      moduleId: string;
    }) => {
      if (!user?.id || !imo?.id || !agency?.id)
        throw new Error("Not authenticated");
      return trainingProgressService.startLesson(
        lessonId,
        moduleId,
        imo.id,
        agency.id,
        user.id,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trainingProgressKeys.byModule(data.module_id, data.user_id),
      });
    },
  });
}

export function useCompleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonId,
      timeSpentSeconds,
    }: {
      lessonId: string;
      timeSpentSeconds: number;
    }) => trainingProgressService.completeLesson(lessonId, timeSpentSeconds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: trainingProgressKeys.all });
      queryClient.invalidateQueries({ queryKey: trainingModuleKeys.all });
      queryClient.invalidateQueries({ queryKey: ["training-gamification"] });

      if (result.module_completed) {
        toast.success("Module completed! Great work!");
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
