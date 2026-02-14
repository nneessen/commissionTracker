// src/features/training-modules/types/pdf-extraction.types.ts
// Types matching the PDF extractor API output

export interface PdfExtraction {
  view_version: string;
  document_id: string;
  page_count: number;
  document_metadata?: {
    title: string;
    carrier: string;
    product: string;
  };
  key_topics?: string[];
  key_points?: KeyPoint[];
  sections?: Section[];
  tables?: ExtractionTable[];
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
  document_id?: string;
  page_number: number;
  table_index?: number;
  rows: number;
  cols: number;
  values: string[][];
  confidence: number;
  source_engine: string;
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
  type: string;
  section_id: string;
  title: string;
  html: string;
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
