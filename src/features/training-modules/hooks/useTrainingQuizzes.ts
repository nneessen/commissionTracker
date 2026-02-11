// src/features/training-modules/hooks/useTrainingQuizzes.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingQuizService } from "../services/trainingQuizService";
import type {
  CreateQuizInput,
  CreateQuestionInput,
  CreateOptionInput,
} from "../types/training-module.types";
import { useImo } from "@/contexts/ImoContext";
import { toast } from "sonner";
import { trainingLessonKeys } from "./useTrainingLessons";

export const quizKeys = {
  all: ["training-quizzes"] as const,
  byLesson: (lessonId: string) =>
    [...quizKeys.all, "lesson", lessonId] as const,
  attempts: (quizId: string, userId: string) =>
    [...quizKeys.all, "attempts", quizId, userId] as const,
};

export function useTrainingQuiz(lessonId: string | undefined) {
  return useQuery({
    queryKey: quizKeys.byLesson(lessonId!),
    queryFn: () => trainingQuizService.getByLessonId(lessonId!),
    enabled: !!lessonId,
  });
}

export function useCreateQuiz() {
  const queryClient = useQueryClient();
  const { imo } = useImo();

  return useMutation({
    mutationFn: (input: CreateQuizInput) =>
      trainingQuizService.createQuiz(input, imo!.id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.byLesson(data.lesson_id),
      });
      queryClient.invalidateQueries({
        queryKey: trainingLessonKeys.withContent(data.lesson_id),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateQuiz() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      lessonId,
      input,
    }: {
      id: string;
      lessonId: string;
      input: Partial<CreateQuizInput>;
    }) => trainingQuizService.updateQuiz(id, input).then(() => lessonId),
    onSuccess: (lessonId) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.byLesson(lessonId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateQuestion() {
  const queryClient = useQueryClient();
  const { imo } = useImo();

  return useMutation({
    mutationFn: ({
      input,
      lessonId,
    }: {
      input: CreateQuestionInput;
      lessonId: string;
    }) =>
      trainingQuizService.createQuestion(input, imo!.id).then((q) => ({
        question: q,
        lessonId,
      })),
    onSuccess: ({ lessonId }) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.byLesson(lessonId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      lessonId,
      input,
    }: {
      id: string;
      lessonId: string;
      input: Partial<Omit<CreateQuestionInput, "quiz_id">>;
    }) => trainingQuizService.updateQuestion(id, input).then(() => lessonId),
    onSuccess: (lessonId) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.byLesson(lessonId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, lessonId }: { id: string; lessonId: string }) =>
      trainingQuizService.deleteQuestion(id).then(() => lessonId),
    onSuccess: (lessonId) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.byLesson(lessonId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useCreateOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      input,
      lessonId,
    }: {
      input: CreateOptionInput;
      lessonId: string;
    }) =>
      trainingQuizService.createOption(input).then((o) => ({
        option: o,
        lessonId,
      })),
    onSuccess: ({ lessonId }) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.byLesson(lessonId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      lessonId,
      input,
    }: {
      id: string;
      lessonId: string;
      input: Partial<Omit<CreateOptionInput, "question_id">>;
    }) => trainingQuizService.updateOption(id, input).then(() => lessonId),
    onSuccess: (lessonId) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.byLesson(lessonId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteOption() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, lessonId }: { id: string; lessonId: string }) =>
      trainingQuizService.deleteOption(id).then(() => lessonId),
    onSuccess: (lessonId) => {
      queryClient.invalidateQueries({
        queryKey: quizKeys.byLesson(lessonId),
      });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
