// src/features/training-modules/services/trainingQuizService.ts
import { supabase } from "@/services/base";
import type {
  TrainingQuizWithQuestions,
  TrainingQuizAttempt,
  SubmitQuizAttemptResult,
} from "../types/training-module.types";

export const trainingQuizService = {
  async getByLessonId(
    lessonId: string,
  ): Promise<TrainingQuizWithQuestions | null> {
    const { data, error } = await supabase
      .from("training_quizzes")
      .select(
        "*, questions:training_quiz_questions(*, options:training_quiz_options(*))",
      )
      .eq("lesson_id", lessonId)
      .single();
    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }
    return data as unknown as TrainingQuizWithQuestions;
  },

  async getAttempts(
    quizId: string,
    userId: string,
  ): Promise<TrainingQuizAttempt[]> {
    const { data, error } = await supabase
      .from("training_quiz_attempts")
      .select("*")
      .eq("quiz_id", quizId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as TrainingQuizAttempt[];
  },

  async submitAttempt(
    quizId: string,
    answers: { question_id: string; selected_option_ids: string[] }[],
    timeTakenSeconds: number,
  ): Promise<SubmitQuizAttemptResult> {
    const { data, error } = await supabase.rpc("submit_training_quiz_attempt", {
      p_quiz_id: quizId,
      p_answers: answers,
      p_time_taken_seconds: timeTakenSeconds,
    });
    if (error) throw error;
    return data as SubmitQuizAttemptResult;
  },
};
