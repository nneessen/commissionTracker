// scripts/pdf-pipeline/types.ts
// Shared types for PDF extraction → seed pipeline

// ─────────────────────────────────────────────────────────────────────────────
// Extraction Input Types (matches actual extractor output)
// ─────────────────────────────────────────────────────────────────────────────

export interface PdfExtraction {
  view_version: string;
  document_id: string;
  page_count: number;
  document_metadata: {
    title: string;
    carrier: string;
    product: string;
  };
  key_topics: string[];
  key_points: KeyPoint[];
  sections: Section[];
  tables: ExtractionTable[];
  lessons: ExtractionLesson[];
  module_seed: ExtractionModuleSeed;
  pages: ExtractionPage[];
}

export interface Section {
  section_id: string;
  header: string;
  page_numbers: number[];
  full_text: string;
  table_ids: string[];
  key_points: KeyPoint[];
  quality_score: number;
  is_trivial: boolean;
}

export interface ExtractionTable {
  table_id: string;
  page_number: number;
  section_id: string;
  section_header: string;
  source_engine: string;
  confidence: number;
  row_count: number;
  col_count: number;
  headers: string[];
  rows: Record<string, string>[];
  html: string;
}

export interface KeyPoint {
  page_number: number;
  text: string;
  score: number;
  parent_context: {
    type: string;
    section_id: string;
    section_header: string;
  };
}

export interface ExtractionPage {
  page_number: number;
  section_ids: string[];
  table_ids: string[];
  key_points: KeyPoint[];
}

export interface ExtractionContentBlock {
  type: string; // "rich_text_content" | "table"
  section_id: string;
  title: string;
  html: string;
  // Table-specific fields
  table_id?: string;
  headers?: string[];
  rows?: Record<string, string>[];
}

export interface ExtractionQuiz {
  question_id: string;
  question_text: string;
  options: { text: string; is_correct: boolean }[];
  explanation: string;
  source_context: {
    type: string;
    section_id: string;
    section_header: string;
  };
}

export interface ExtractionLesson {
  lesson_id: string;
  title: string;
  topic: string;
  learning_objective: string;
  section_ids: string[];
  page_numbers: number[];
  key_points: KeyPoint[];
  content_blocks: ExtractionContentBlock[];
  quizzes: ExtractionQuiz[];
  score: number;
}

export interface ExtractionModuleSeed {
  title: string;
  description: string;
  tags: string[];
  lesson_count: number;
  lessons: ExtractionLesson[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Lesson Grouping Config (optional manual override)
// ─────────────────────────────────────────────────────────────────────────────

export interface LessonGroupConfig {
  title: string;
  sections: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed Output Types (matches existing seed scripts exactly)
// ─────────────────────────────────────────────────────────────────────────────

export interface ContentBlockSeed {
  content_type: string;
  title: string;
  rich_text_content?: string;
  script_prompt_text?: string;
  script_prompt_instructions?: string;
  external_url?: string;
  external_url_label?: string;
}

export interface QuizOptionSeed {
  option_text: string;
  is_correct: boolean;
}

export interface QuizQuestionSeed {
  question_type: string;
  question_text: string;
  explanation: string;
  points: number;
  options: QuizOptionSeed[];
}

export interface QuizSeed {
  pass_threshold: number;
  max_attempts: number;
  shuffle_questions: boolean;
  show_correct_answers: boolean;
  shuffle_options: boolean;
  xp_bonus_perfect: number;
  time_limit_minutes?: number;
  questions: QuizQuestionSeed[];
}

export interface LessonSeed {
  title: string;
  lesson_type: string;
  estimated_duration_minutes: number;
  xp_reward: number;
  description: string;
  is_required: boolean;
  content_blocks?: ContentBlockSeed[];
  quiz?: QuizSeed;
}

export interface ModuleSeed {
  title: string;
  description: string;
  category: string;
  difficulty: string;
  duration: number;
  xp: number;
  tags: string[];
  lessons: LessonSeed[];
}
