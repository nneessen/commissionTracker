// src/features/training-modules/types/training-module.types.ts

// ============================================================================
// Module Categories & Constants
// ============================================================================

export const MODULE_CATEGORIES = [
  "script_training",
  "objections_rebuttals",
  "product_knowledge",
  "carrier_training",
  "compliance",
  "sales_techniques",
  "onboarding",
  "custom",
] as const;

export type ModuleCategory = (typeof MODULE_CATEGORIES)[number];

export const MODULE_CATEGORY_LABELS: Record<ModuleCategory, string> = {
  script_training: "Script Training",
  objections_rebuttals: "Objections & Rebuttals",
  product_knowledge: "Product Knowledge",
  carrier_training: "Carrier Training",
  compliance: "Compliance",
  sales_techniques: "Sales Techniques",
  onboarding: "Onboarding",
  custom: "Custom",
};

export const DIFFICULTY_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

export const LESSON_TYPES = ["content", "quiz", "practice"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export const CONTENT_TYPES = [
  "rich_text",
  "pdf",
  "video",
  "external_link",
  "script_prompt",
  "slides",
] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const VIDEO_PLATFORMS = ["youtube", "vimeo", "loom"] as const;
export type VideoPlatform = (typeof VIDEO_PLATFORMS)[number];

export const QUESTION_TYPES = ["multiple_choice", "true_false"] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const ASSIGNMENT_TYPES = ["individual", "agency"] as const;
export type AssignmentType = (typeof ASSIGNMENT_TYPES)[number];

export const PRIORITY_LEVELS = ["low", "normal", "high", "urgent"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const PROGRESS_STATUSES = [
  "not_started",
  "in_progress",
  "completed",
] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

export const ASSIGNMENT_STATUSES = ["active", "completed", "revoked"] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const XP_SOURCE_TYPES = [
  "lesson_complete",
  "module_complete",
  "quiz_pass",
  "quiz_perfect",
  "streak_bonus",
  "challenge_complete",
  "badge_earned",
] as const;
export type XpSourceType = (typeof XP_SOURCE_TYPES)[number];

export const BADGE_TYPES = [
  "category_mastery",
  "milestone",
  "streak",
  "special",
] as const;
export type BadgeType = (typeof BADGE_TYPES)[number];

export const CHALLENGE_TYPES = [
  "complete_modules",
  "earn_xp",
  "quiz_score",
  "streak",
] as const;
export type ChallengeType = (typeof CHALLENGE_TYPES)[number];

// ============================================================================
// Core Entities
// ============================================================================

export interface TrainingModule {
  id: string;
  imo_id: string;
  agency_id: string | null;
  title: string;
  description: string | null;
  category: ModuleCategory;
  thumbnail_url: string | null;
  difficulty_level: DifficultyLevel;
  estimated_duration_minutes: number | null;
  xp_reward: number;
  is_published: boolean;
  is_active: boolean;
  version: number;
  created_by: string;
  updated_by: string | null;
  published_at: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface TrainingLesson {
  id: string;
  module_id: string;
  imo_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  lesson_type: LessonType;
  xp_reward: number;
  is_required: boolean;
  estimated_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingLessonContent {
  id: string;
  lesson_id: string;
  imo_id: string;
  content_type: ContentType;
  sort_order: number;
  title: string | null;
  rich_text_content: string | null;
  video_url: string | null;
  video_platform: VideoPlatform | null;
  document_id: string | null;
  external_url: string | null;
  external_url_label: string | null;
  script_prompt_text: string | null;
  script_prompt_instructions: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Quiz Entities
// ============================================================================

export interface TrainingQuiz {
  id: string;
  lesson_id: string;
  imo_id: string;
  pass_threshold: number;
  max_attempts: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_correct_answers: boolean;
  time_limit_minutes: number | null;
  xp_bonus_perfect: number;
  created_at: string;
  updated_at: string;
}

export interface TrainingQuizQuestion {
  id: string;
  quiz_id: string;
  imo_id: string;
  question_text: string;
  question_type: QuestionType;
  explanation: string | null;
  sort_order: number;
  points: number;
  created_at: string;
  updated_at: string;
  // Populated in queries
  options?: TrainingQuizOption[];
}

export interface TrainingQuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
  created_at: string;
}

// ============================================================================
// Assignment & Progress
// ============================================================================

export interface TrainingAssignment {
  id: string;
  module_id: string;
  imo_id: string;
  agency_id: string;
  assigned_to: string | null;
  assignment_type: AssignmentType;
  assigned_by: string;
  due_date: string | null;
  priority: PriorityLevel;
  is_mandatory: boolean;
  module_version: number;
  status: AssignmentStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  module?: TrainingModule;
  assigned_to_profile?: { full_name: string; email: string };
}

export interface TrainingProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  module_id: string;
  imo_id: string;
  agency_id: string;
  status: ProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  time_spent_seconds: number;
  last_accessed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrainingQuizAttempt {
  id: string;
  user_id: string;
  quiz_id: string;
  lesson_id: string;
  module_id: string;
  imo_id: string;
  agency_id: string;
  score_percentage: number;
  score_points: number;
  max_points: number;
  passed: boolean;
  answers: QuizAnswer[];
  time_taken_seconds: number | null;
  attempt_number: number;
  completed_at: string;
  created_at: string;
}

export interface QuizAnswer {
  question_id: string;
  selected_option_ids: string[];
  is_correct: boolean;
}

// ============================================================================
// Gamification
// ============================================================================

export interface TrainingXpEntry {
  id: string;
  user_id: string;
  imo_id: string;
  agency_id: string;
  xp_amount: number;
  source_type: XpSourceType;
  source_id: string | null;
  description: string | null;
  created_at: string;
}

export interface TrainingUserStats {
  user_id: string;
  imo_id: string;
  agency_id: string;
  total_xp: number;
  modules_completed: number;
  lessons_completed: number;
  quizzes_passed: number;
  avg_quiz_score: number;
  current_streak_days: number;
  longest_streak_days: number;
  last_activity_date: string | null;
  total_time_spent_seconds: number;
  updated_at: string;
}

export interface TrainingBadge {
  id: string;
  imo_id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  badge_type: BadgeType;
  criteria: BadgeCriteria;
  xp_reward: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type BadgeCriteria =
  | { type: "category_modules_complete"; category: string; min_count: number }
  | { type: "quiz_avg_score"; min_score: number; min_attempts: number }
  | { type: "streak_days"; min_days: number }
  | { type: "total_xp"; min_xp: number }
  | { type: "module_complete"; module_id: string }
  | { type: "modules_completed_in_period"; count: number; period_days: number }
  | { type: "lessons_completed"; min_count: number }
  | { type: "quizzes_passed"; min_count: number };

export interface TrainingUserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  imo_id: string;
  agency_id: string;
  earned_at: string;
  badge?: TrainingBadge;
}

// ============================================================================
// Certifications & Challenges
// ============================================================================

export interface TrainingCertification {
  id: string;
  imo_id: string;
  name: string;
  description: string | null;
  required_module_ids: string[];
  validity_months: number | null;
  badge_id: string | null;
  xp_reward: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingUserCertification {
  id: string;
  user_id: string;
  certification_id: string;
  imo_id: string;
  agency_id: string;
  earned_at: string;
  expires_at: string | null;
  status: "active" | "expired" | "revoked";
  certification?: TrainingCertification;
}

export interface TrainingChallenge {
  id: string;
  imo_id: string;
  agency_id: string | null;
  title: string;
  description: string | null;
  challenge_type: ChallengeType;
  target_value: number;
  start_date: string;
  end_date: string;
  xp_reward: number;
  badge_id: string | null;
  created_by: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TrainingChallengeParticipant {
  id: string;
  challenge_id: string;
  user_id: string;
  imo_id: string;
  agency_id: string;
  current_value: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

// ============================================================================
// RPC Response Types
// ============================================================================

export interface CompleteTrainingLessonResult {
  xp_earned: number;
  module_completed: boolean;
  lesson_id: string;
}

export interface SubmitQuizAttemptResult {
  score_percentage: number;
  score_points: number;
  max_points: number;
  passed: boolean;
  attempt_number: number;
  xp_earned: number;
  answers: QuizAnswer[];
}

export interface LeaderboardEntry {
  user_id: string;
  full_name: string;
  total_xp: number;
  modules_completed: number;
  current_streak_days: number;
  rank: number;
}

export interface ModuleProgressSummary {
  lesson_id: string;
  lesson_title: string;
  lesson_type: LessonType;
  sort_order: number;
  is_required: boolean;
  status: ProgressStatus;
  completed_at: string | null;
  time_spent_seconds: number;
}

export interface TeamTrainingAnalytics {
  active_learners: number;
  total_assignments: number;
  completed_assignments: number;
  avg_quiz_score: number | null;
  total_xp_earned: number;
}

export interface SkillRadarData {
  category: string;
  completed_modules: number;
  total_modules: number;
  proficiency_pct: number;
}

// ============================================================================
// Presentation Submissions
// ============================================================================

export const PRESENTATION_STATUSES = ["pending", "approved", "needs_improvement"] as const;
export type PresentationStatus = (typeof PRESENTATION_STATUSES)[number];

export const RECORDING_TYPES = ["browser_recording", "upload"] as const;
export type RecordingType = (typeof RECORDING_TYPES)[number];

export interface PresentationSubmission {
  id: string;
  imo_id: string;
  agency_id: string;
  user_id: string;
  title: string;
  description: string | null;
  week_start: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  duration_seconds: number | null;
  recording_type: RecordingType;
  status: PresentationStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  submitter?: { id: string; first_name: string; last_name: string; email: string };
  reviewer?: { id: string; first_name: string; last_name: string } | null;
}

export interface PresentationSubmissionFilters {
  userId?: string;
  agencyId?: string;
  weekStart?: string;
  status?: PresentationStatus;
}

// ============================================================================
// Form / Input Types
// ============================================================================

export interface CreateModuleInput {
  title: string;
  description?: string;
  category: ModuleCategory;
  difficulty_level?: DifficultyLevel;
  estimated_duration_minutes?: number;
  xp_reward?: number;
  tags?: string[];
  agency_id?: string;
}

export interface UpdateModuleInput extends Partial<CreateModuleInput> {
  is_published?: boolean;
  is_active?: boolean;
  thumbnail_url?: string;
}

export interface CreateLessonInput {
  module_id: string;
  title: string;
  description?: string;
  sort_order: number;
  lesson_type: LessonType;
  xp_reward?: number;
  is_required?: boolean;
  estimated_duration_minutes?: number;
}

export interface CreateContentBlockInput {
  lesson_id: string;
  content_type: ContentType;
  sort_order: number;
  title?: string;
  rich_text_content?: string;
  video_url?: string;
  video_platform?: VideoPlatform;
  document_id?: string;
  external_url?: string;
  external_url_label?: string;
  script_prompt_text?: string;
  script_prompt_instructions?: string;
}

export interface CreateQuizInput {
  lesson_id: string;
  pass_threshold?: number;
  max_attempts?: number;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_correct_answers?: boolean;
  time_limit_minutes?: number;
  xp_bonus_perfect?: number;
}

export interface CreateQuestionInput {
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  explanation?: string;
  sort_order: number;
  points?: number;
}

export interface CreateOptionInput {
  question_id: string;
  option_text: string;
  is_correct: boolean;
  sort_order: number;
}

export interface CreateBadgeInput {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  badge_type: BadgeType;
  criteria: BadgeCriteria;
  xp_reward?: number;
  is_active?: boolean;
  sort_order?: number;
}

export interface CreateAssignmentInput {
  module_id: string;
  agency_id: string;
  assigned_to?: string;
  assignment_type: AssignmentType;
  due_date?: string;
  priority?: PriorityLevel;
  is_mandatory?: boolean;
}

// ============================================================================
// Module with joined data (for builder/viewer)
// ============================================================================

export interface TrainingModuleWithLessons extends TrainingModule {
  lessons: TrainingLessonWithContent[];
}

export interface TrainingLessonWithContent extends TrainingLesson {
  content_blocks: TrainingLessonContent[];
  quiz?: TrainingQuizWithQuestions;
}

export interface TrainingQuizWithQuestions extends TrainingQuiz {
  questions: TrainingQuizQuestion[];
}
