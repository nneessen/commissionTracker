// src/features/training-modules/hooks/useTrainingLessons.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingLessonService } from "../services/trainingLessonService";
import type {
  CreateLessonInput,
  CreateContentBlockInput,
} from "../types/training-module.types";
import { useImo } from "@/contexts/ImoContext";
import { toast } from "sonner";
import { trainingModuleKeys } from "./useTrainingModules";

export const trainingLessonKeys = {
  all: ["training-lessons"] as const,
  byModule: (moduleId: string) =>
    [...trainingLessonKeys.all, "module", moduleId] as const,
  detail: (lessonId: string) =>
    [...trainingLessonKeys.all, "detail", lessonId] as const,
  withContent: (lessonId: string) =>
    [...trainingLessonKeys.all, "content", lessonId] as const,
};

export function useTrainingLessons(moduleId: string | undefined) {
  return useQuery({
    queryKey: trainingLessonKeys.byModule(moduleId!),
    queryFn: () => trainingLessonService.listByModule(moduleId!),
    enabled: !!moduleId,
  });
}

export function useTrainingLessonWithContent(lessonId: string | undefined) {
  return useQuery({
    queryKey: trainingLessonKeys.withContent(lessonId!),
    queryFn: () => trainingLessonService.getWithContent(lessonId!),
    enabled: !!lessonId,
  });
}

export function useCreateTrainingLesson() {
  const queryClient = useQueryClient();
  const { imo } = useImo();

  return useMutation({
    mutationFn: (input: CreateLessonInput) =>
      trainingLessonService.create(input, imo!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.byModule(data.module_id),
      });
      queryClient.invalidateQueries({ queryKey: trainingModuleKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateTrainingLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<CreateLessonInput>;
    }) => trainingLessonService.update(id, input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.byModule(data.module_id),
      });
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.withContent(data.id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteTrainingLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, moduleId }: { id: string; moduleId: string }) =>
      trainingLessonService.delete(id).then(() => moduleId),
    onSuccess: (moduleId) => {
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.byModule(moduleId),
      });
      queryClient.invalidateQueries({ queryKey: trainingModuleKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useReorderTrainingLessons() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonIds,
      moduleId,
    }: {
      lessonIds: string[];
      moduleId: string;
    }) => trainingLessonService.reorder(lessonIds).then(() => moduleId),
    onSuccess: (moduleId) => {
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.byModule(moduleId),
      });
    },
  });
}

export function useCreateContentBlock() {
  const queryClient = useQueryClient();
  const { imo } = useImo();

  return useMutation({
    mutationFn: (input: CreateContentBlockInput) =>
      trainingLessonService.createContentBlock(input, imo!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.withContent(data.lesson_id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateContentBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      lessonId,
      input,
    }: {
      id: string;
      lessonId: string;
      input: Partial<CreateContentBlockInput>;
    }) =>
      trainingLessonService.updateContentBlock(id, input).then(() => lessonId),
    onSuccess: (lessonId) => {
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.withContent(lessonId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDuplicateTrainingLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      lessonId,
      moduleId,
    }: {
      lessonId: string;
      moduleId: string;
    }) => trainingLessonService.duplicate(lessonId).then((data) => ({ data, moduleId })),
    onSuccess: ({ moduleId }) => {
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.byModule(moduleId),
      });
      queryClient.invalidateQueries({ queryKey: trainingModuleKeys.all });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteContentBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, lessonId }: { id: string; lessonId: string }) =>
      trainingLessonService.deleteContentBlock(id).then(() => lessonId),
    onSuccess: (lessonId) => {
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.withContent(lessonId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
