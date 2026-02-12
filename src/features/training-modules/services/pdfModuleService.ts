// src/features/training-modules/services/pdfModuleService.ts
// Service for creating training modules from PDF uploads via Railway extractor

import type {
  PdfExtraction,
  ExtractionContentBlock,
  ExtractionQuiz,
} from "../types/pdf-extraction.types";
import type {
  CreateModuleInput,
  CreateLessonInput,
  CreateContentBlockInput,
  CreateQuizInput,
  CreateQuestionInput,
  CreateOptionInput,
  ModuleCategory,
  TrainingModule,
} from "../types/training-module.types";
import { trainingModuleService } from "./trainingModuleService";
import { trainingLessonService } from "./trainingLessonService";
import { trainingQuizService } from "./trainingQuizService";

// Proxied through Vite dev server + Vercel rewrite to avoid CORS
const EXTRACTOR_URL = "/api/pdf-extract";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ContentBlockSeed {
  content_type: "rich_text";
  title: string;
  rich_text_content: string;
}

interface QuizSeed {
  pass_threshold: number;
  max_attempts: number;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  shuffle_options: boolean;
  xp_bonus_perfect: number;
  questions: QuizQuestionSeed[];
}

interface QuizQuestionSeed {
  question_type: "multiple_choice";
  question_text: string;
  explanation: string;
  points: number;
  options: { option_text: string; is_correct: boolean }[];
}

interface LessonSeed {
  title: string;
  lesson_type: "content" | "quiz";
  estimated_duration_minutes: number;
  xp_reward: number;
  description: string;
  is_required: boolean;
  content_blocks?: ContentBlockSeed[];
  quiz?: QuizSeed;
}

export interface ModuleSeedData {
  moduleInput: CreateModuleInput;
  lessons: LessonSeed[];
}

export interface SeedProgress {
  stage: "extracting" | "transforming" | "inserting" | "done" | "error";
  message: string;
  lessonProgress?: { current: number; total: number };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extract PDF via Railway API
// ─────────────────────────────────────────────────────────────────────────────

export async function extractPdf(file: File): Promise<PdfExtraction> {
  const formData = new FormData();
  formData.append("pdf", file);
  formData.append("mode", "ocr_layout");
  formData.append("output_format", "training");

  const response = await fetch(EXTRACTOR_URL, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`PDF extraction failed (${response.status}): ${text}`);
  }

  const result = await response.json();

  if (result.ok === false) {
    throw new Error(result.error || "PDF extraction returned an error");
  }

  // API wraps extraction in result.result
  const inner = result.result;
  if (!inner) {
    throw new Error("Unexpected API response: missing 'result' field");
  }

  // Check for outdated extractor (pre-1.14 lacks document_metadata/sections/lessons)
  if (!inner.document_metadata && inner.view_version) {
    throw new Error(
      `PDF extractor version ${inner.view_version} is outdated. ` +
        `Version training-1.14.0+ is required. Please redeploy the extractor.`,
    );
  }

  return inner as PdfExtraction;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transform extraction → seed data
// ─────────────────────────────────────────────────────────────────────────────

export function transformExtraction(
  extraction: PdfExtraction,
  category: ModuleCategory = "carrier_training",
): ModuleSeedData {
  validateExtraction(extraction);

  const meta = extraction.document_metadata;
  const extractorLessons =
    extraction.lessons.length > 0
      ? extraction.lessons
      : extraction.module_seed?.lessons || [];

  if (extractorLessons.length === 0) {
    throw new Error(
      "No lessons found in extraction. The PDF may not contain structured content.",
    );
  }

  // Map content lessons
  const contentLessons: LessonSeed[] = [];
  for (const lesson of extractorLessons) {
    const blocks = mapContentBlocks(lesson.content_blocks);
    if (blocks.length > 0) {
      const totalWords = blocks.reduce((sum, b) => {
        const text = (b.rich_text_content || "").replace(/<[^>]+>/g, "");
        return sum + text.split(/\s+/).length;
      }, 0);
      const readingMinutes = Math.max(5, Math.ceil(totalWords / 200));

      contentLessons.push({
        title: lesson.title,
        lesson_type: "content",
        estimated_duration_minutes: readingMinutes,
        xp_reward: 25,
        description:
          lesson.learning_objective ||
          "Learn about " + lesson.title.toLowerCase() + ".",
        is_required: true,
        content_blocks: blocks,
      });
    }
  }

  // Collect quizzes
  const extractorQuizzes = extractorLessons.flatMap((l) => l.quizzes || []);
  const quizSeeds: QuizSeed[] =
    extractorQuizzes.length > 0 ? [mapExtractorQuizzes(extractorQuizzes)] : [];

  // Interleave
  const allLessons = interleave(contentLessons, quizSeeds);

  const moduleInput: CreateModuleInput = {
    title:
      extraction.module_seed?.title ||
      meta.carrier + " " + meta.product + " Training",
    description:
      extraction.module_seed?.description ||
      "Comprehensive training module for " +
        meta.carrier +
        " " +
        meta.product +
        ".",
    category,
    difficulty_level: "intermediate",
    estimated_duration_minutes: allLessons.reduce(
      (sum, l) => sum + l.estimated_duration_minutes,
      0,
    ),
    xp_reward: allLessons.reduce((sum, l) => sum + l.xp_reward, 0),
    tags: extraction.module_seed?.tags || [
      meta.carrier.toLowerCase(),
      meta.product.toLowerCase(),
      "training",
    ],
  };

  return { moduleInput, lessons: allLessons };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed module via existing services
// ─────────────────────────────────────────────────────────────────────────────

export async function seedModule(
  data: ModuleSeedData,
  userId: string,
  imoId: string,
  onProgress?: (progress: SeedProgress) => void,
): Promise<TrainingModule> {
  const { moduleInput, lessons } = data;

  // Create module
  const mod = await trainingModuleService.create(moduleInput, userId, imoId);

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    onProgress?.({
      stage: "inserting",
      message: `Creating lesson ${i + 1}/${lessons.length}: "${lesson.title}"`,
      lessonProgress: { current: i + 1, total: lessons.length },
    });

    const lessonInput: CreateLessonInput = {
      module_id: mod.id,
      title: lesson.title,
      description: lesson.description,
      sort_order: i,
      lesson_type: lesson.lesson_type,
      xp_reward: lesson.xp_reward,
      is_required: lesson.is_required,
      estimated_duration_minutes: lesson.estimated_duration_minutes,
    };

    const les = await trainingLessonService.create(lessonInput, imoId);

    // Content blocks
    if (lesson.content_blocks) {
      for (let j = 0; j < lesson.content_blocks.length; j++) {
        const block = lesson.content_blocks[j];
        const blockInput: CreateContentBlockInput = {
          lesson_id: les.id,
          content_type: block.content_type,
          sort_order: j,
          title: block.title,
          rich_text_content: block.rich_text_content,
        };
        await trainingLessonService.createContentBlock(blockInput, imoId);
      }
    }

    // Quiz
    if (lesson.quiz) {
      const quiz = lesson.quiz;
      const quizInput: CreateQuizInput = {
        lesson_id: les.id,
        pass_threshold: quiz.pass_threshold,
        max_attempts: quiz.max_attempts,
        shuffle_questions: quiz.shuffle_questions,
        show_correct_answers: quiz.show_correct_answers,
        shuffle_options: quiz.shuffle_options,
        xp_bonus_perfect: quiz.xp_bonus_perfect,
      };

      const q = await trainingQuizService.createQuiz(quizInput, imoId);

      for (let k = 0; k < quiz.questions.length; k++) {
        const question = quiz.questions[k];
        const questionInput: CreateQuestionInput = {
          quiz_id: q.id,
          question_text: question.question_text,
          question_type: question.question_type,
          explanation: question.explanation,
          sort_order: k,
          points: question.points,
        };

        const qn = await trainingQuizService.createQuestion(
          questionInput,
          imoId,
        );

        for (let m = 0; m < question.options.length; m++) {
          const opt = question.options[m];
          const optionInput: CreateOptionInput = {
            question_id: qn.id,
            option_text: opt.option_text,
            is_correct: opt.is_correct,
            sort_order: m,
          };
          await trainingQuizService.createOption(optionInput);
        }
      }
    }
  }

  return mod;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (ported from scripts/pdf-pipeline/transform.ts)
// ─────────────────────────────────────────────────────────────────────────────

function mapContentBlocks(
  blocks: ExtractionContentBlock[],
): ContentBlockSeed[] {
  return blocks
    .filter((b) => b.html && b.html.trim().length > 0)
    .map((b) => ({
      content_type: "rich_text" as const,
      title: b.title || "Content",
      rich_text_content: b.html,
    }));
}

function mapExtractorQuizzes(quizzes: ExtractionQuiz[]): QuizSeed {
  const questions: QuizQuestionSeed[] = quizzes.map((q) => ({
    question_type: "multiple_choice" as const,
    question_text: q.question_text,
    explanation: q.explanation || "",
    points: 10,
    options: q.options.map((o) => ({
      option_text: o.text,
      is_correct: o.is_correct,
    })),
  }));

  return {
    pass_threshold: 70,
    max_attempts: 3,
    shuffle_questions: true,
    show_correct_answers: true,
    shuffle_options: true,
    xp_bonus_perfect: 25,
    questions,
  };
}

function interleave(
  contentLessons: LessonSeed[],
  quizSeeds: QuizSeed[],
): LessonSeed[] {
  if (quizSeeds.length === 0) return contentLessons;

  const allLessons: LessonSeed[] = [];
  let quizIdx = 0;
  const contentPerQuiz = Math.ceil(
    contentLessons.length / Math.max(1, quizSeeds.length),
  );

  for (let i = 0; i < contentLessons.length; i++) {
    allLessons.push(contentLessons[i]);

    if ((i + 1) % contentPerQuiz === 0 && quizIdx < quizSeeds.length) {
      const quizNumber = quizIdx + 1;
      allLessons.push({
        title: "Knowledge Check " + quizNumber,
        lesson_type: "quiz",
        estimated_duration_minutes: 10,
        xp_reward: 50,
        description: "Test your understanding of the material covered so far.",
        is_required: true,
        quiz: quizSeeds[quizIdx],
      });
      quizIdx++;
    }
  }

  while (quizIdx < quizSeeds.length) {
    allLessons.push({
      title: "Final Knowledge Check",
      lesson_type: "quiz",
      estimated_duration_minutes: 10,
      xp_reward: 50,
      description: "Final assessment covering all module content.",
      is_required: true,
      quiz: quizSeeds[quizIdx],
    });
    quizIdx++;
  }

  return allLessons;
}

function validateExtraction(extraction: PdfExtraction): void {
  const errors: string[] = [];

  if (!extraction.document_metadata) {
    errors.push("Missing document_metadata");
  } else {
    if (!extraction.document_metadata.title)
      errors.push("Missing document_metadata.title");
    if (!extraction.document_metadata.carrier)
      errors.push("Missing document_metadata.carrier");
    if (!extraction.document_metadata.product)
      errors.push("Missing document_metadata.product");
  }

  if (!extraction.sections || extraction.sections.length === 0) {
    errors.push("Missing or empty sections[]");
  }

  if (errors.length > 0) {
    throw new Error("Invalid extraction: " + errors.join(", "));
  }
}
