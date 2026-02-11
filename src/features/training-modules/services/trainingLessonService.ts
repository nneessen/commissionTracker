// src/features/training-modules/services/trainingLessonService.ts
import { supabase } from "@/services/base";
import type {
  TrainingLesson,
  TrainingLessonContent,
  TrainingLessonWithContent,
  CreateLessonInput,
  CreateContentBlockInput,
} from "../types/training-module.types";

export const trainingLessonService = {
  async listByModule(moduleId: string): Promise<TrainingLesson[]> {
    const { data, error } = await supabase
      .from("training_lessons")
      .select("*")
      .eq("module_id", moduleId)
      .order("sort_order");
    if (error) throw error;
    return data as TrainingLesson[];
  },

  async getWithContent(lessonId: string): Promise<TrainingLessonWithContent> {
    const { data: lesson, error: lessonError } = await supabase
      .from("training_lessons")
      .select("*")
      .eq("id", lessonId)
      .single();
    if (lessonError) throw lessonError;

    const { data: contentBlocks, error: contentError } = await supabase
      .from("training_lesson_content")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("sort_order");
    if (contentError) throw contentError;

    // If quiz lesson, fetch quiz with questions
    let quiz = undefined;
    if (lesson.lesson_type === "quiz") {
      const { data: quizData } = await supabase
        .from("training_quizzes")
        .select(
          "*, questions:training_quiz_questions(*, options:training_quiz_options(*))",
        )
        .eq("lesson_id", lessonId)
        .single();
      if (quizData) {
        quiz = quizData;
      }
    }

    return {
      ...lesson,
      content_blocks: contentBlocks as TrainingLessonContent[],
      quiz,
    } as TrainingLessonWithContent;
  },

  async create(
    input: CreateLessonInput,
    imoId: string,
  ): Promise<TrainingLesson> {
    const { data, error } = await supabase
      .from("training_lessons")
      .insert({ ...input, imo_id: imoId })
      .select()
      .single();
    if (error) throw error;
    return data as TrainingLesson;
  },

  async update(
    id: string,
    input: Partial<CreateLessonInput>,
  ): Promise<TrainingLesson> {
    const { data, error } = await supabase
      .from("training_lessons")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TrainingLesson;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from("training_lessons")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async reorder(lessonIds: string[]): Promise<void> {
    const updates = lessonIds.map((id, index) => ({
      id,
      sort_order: index,
    }));
    for (const update of updates) {
      const { error } = await supabase
        .from("training_lessons")
        .update({ sort_order: update.sort_order })
        .eq("id", update.id);
      if (error) throw error;
    }
  },

  async createContentBlock(
    input: CreateContentBlockInput,
    imoId: string,
  ): Promise<TrainingLessonContent> {
    const { data, error } = await supabase
      .from("training_lesson_content")
      .insert({ ...input, imo_id: imoId })
      .select()
      .single();
    if (error) throw error;
    return data as TrainingLessonContent;
  },

  async updateContentBlock(
    id: string,
    input: Partial<CreateContentBlockInput>,
  ): Promise<TrainingLessonContent> {
    const { data, error } = await supabase
      .from("training_lesson_content")
      .update(input)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as TrainingLessonContent;
  },

  async deleteContentBlock(id: string): Promise<void> {
    const { error } = await supabase
      .from("training_lesson_content")
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async duplicate(lessonId: string): Promise<TrainingLesson> {
    const { data, error } = await supabase.rpc("duplicate_training_lesson", {
      p_lesson_id: lessonId,
    });
    if (error) throw error;
    return data as unknown as TrainingLesson;
  },
};
