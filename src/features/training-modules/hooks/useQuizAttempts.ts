// src/features/training-modules/hooks/useQuizAttempts.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { trainingQuizService } from "../services/trainingQuizService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { trainingProgressKeys } from "./useTrainingProgress";

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

export function useQuizAttempts(quizId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: quizKeys.attempts(quizId!, user?.id || ""),
    queryFn: () => trainingQuizService.getAttempts(quizId!, user!.id!),
    enabled: !!quizId && !!user?.id,
  });
}

export function useSubmitQuizAttempt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      quizId,
      answers,
      timeTakenSeconds,
    }: {
      quizId: string;
      answers: { question_id: string; selected_option_ids: string[] }[];
      timeTakenSeconds: number;
    }) => trainingQuizService.submitAttempt(quizId, answers, timeTakenSeconds),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: quizKeys.all });
      queryClient.invalidateQueries({ queryKey: trainingProgressKeys.all });
      queryClient.invalidateQueries({ queryKey: ["training-gamification"] });

      if (result.passed) {
        if (result.score_percentage === 100) {
          toast.success("Perfect score!");
        } else {
          toast.success(
            `Passed! Score: ${Math.round(result.score_percentage)}%`,
          );
        }
      } else {
        toast.error(
          `Not quite. Score: ${Math.round(result.score_percentage)}%. Keep trying!`,
        );
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
