// src/types/recruiting.ts
// TypeScript types for recruiting system

// OnboardingStatus mirrors the 7 pipeline phases + completed/dropped
export type OnboardingStatus =
  | 'interview_1'
  | 'zoom_interview'
  | 'pre_licensing'
  | 'exam'
  | 'npn_received'
  | 'contracting'
  | 'bootcamp'
  | 'completed'
  | 'dropped';

// PhaseName matches database pipeline_phases.phase_name values
export type PhaseName =
  | 'Interview 1'
  | 'Zoom Interview'
  | 'Pre-Licensing'
  | 'Exam'
  | 'NPN Received'
  | 'Contracting'
  | 'Bootcamp';

export type PhaseStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';

export type DocumentType =
  | 'application'
  | 'background_check'
  | 'license'
  | 'contract'
  | 'resume'
  | 'identification'
  | 'certification'
  | 'other';

export type DocumentStatus = 'pending' | 'received' | 'approved' | 'rejected' | 'expired';

export type EmailStatus = 'draft' | 'sending' | 'sent' | 'delivered' | 'opened' | 'failed';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'phase_changed'
  | 'document_uploaded'
  | 'document_approved'
  | 'document_rejected'
  | 'email_sent'
  | 'status_changed'
  | 'note_added'
  | 'other';

// NOTE: RecruitingProfile has been removed - use UserProfile from database.ts instead
// Recruits are just users with onboarding_status = 'lead' or 'active'
// This eliminates the need for a separate recruiting_profiles table

export interface OnboardingPhase {
  id: string;
  user_id: string; // Changed from recruit_id - links to user_profiles.id
  phase_name: PhaseName;
  phase_order: number;
  status: PhaseStatus;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  blocked_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserDocument {
  id: string;
  user_id: string; // Changed from recruit_id - links to user_profiles.id
  document_type: DocumentType;
  document_name: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  uploaded_by: string | null;
  uploaded_at: string;
  status: DocumentStatus;
  required: boolean;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserEmail {
  id: string;
  user_id: string; // Changed from recruit_id - links to user_profiles.id
  sender_id: string | null;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  status: EmailStatus;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  failed_reason: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  attachments?: UserEmailAttachment[];
}

export interface UserEmailAttachment {
  id: string;
  email_id: string;
  file_name: string;
  file_size: number | null;
  file_type: string | null;
  storage_path: string;
  created_at: string;
}

export interface UserActivityLog {
  id: string;
  user_id: string; // Changed from recruit_id - links to user_profiles.id
  performed_by: string | null;
  action_type: ActivityAction;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface RecruitFilters {
  onboarding_status?: OnboardingStatus[];
  current_phase?: PhaseName[];
  recruiter_id?: string;
  assigned_upline_id?: string;
  search?: string; // search by name, email
  date_range?: {
    start: string;
    end: string;
  };
}

export interface SendEmailRequest {
  recruitId: string;
  senderId: string;
  subject: string;
  body: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
}

export interface CreateRecruitInput {
  // Basic Info (required)
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  date_of_birth?: string; // ISO date string (YYYY-MM-DD)

  // Address (optional initially, required for contracting)
  street_address?: string;
  city?: string;
  state?: string; // 2-letter state code (mailing address)
  zip?: string;

  // Professional/Licensing (optional initially)
  resident_state?: string; // 2-letter state code (primary licensed state)
  license_number?: string;
  npn?: string; // National Producer Number
  license_expiration?: string; // ISO date string

  // Social Media / Marketing
  instagram_username?: string;
  instagram_url?: string;
  linkedin_username?: string;
  linkedin_url?: string;
  facebook_handle?: string;
  personal_website?: string;

  // Assignment
  recruiter_id: string; // ID of person recruiting them (auto-set to current user)
  upline_id?: string; // ID of person who will manage them (can be different from recruiter)

  // Referral
  referral_source?: string;
}

export interface UpdateRecruitInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  profile_photo_url?: string;
  instagram_username?: string;
  instagram_url?: string;
  linkedin_username?: string;
  linkedin_url?: string;
  upline_id?: string;
  referral_source?: string;
  onboarding_status?: OnboardingStatus;
  current_onboarding_phase?: PhaseName;
}

export interface UpdatePhaseInput {
  status?: PhaseStatus;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  blocked_reason?: string;
}

export interface UploadDocumentInput {
  user_id: string; // Changed from recruit_id
  document_type: DocumentType;
  document_name: string;
  file: File;
  uploaded_by: string;
  required?: boolean;
  expires_at?: string;
}

// Phase display names for UI (matches database phase_name values)
export const PHASE_DISPLAY_NAMES: Record<PhaseName, string> = {
  'Interview 1': 'Interview 1',
  'Zoom Interview': 'Zoom Interview',
  'Pre-Licensing': 'Pre-Licensing',
  'Exam': 'Exam',
  'NPN Received': 'NPN Received',
  'Contracting': 'Contracting',
  'Bootcamp': 'Bootcamp',
};

// Document type display names for UI
export const DOCUMENT_TYPE_DISPLAY_NAMES: Record<DocumentType, string> = {
  application: 'Application Form',
  background_check: 'Background Check',
  license: 'State License',
  contract: 'Carrier Contract',
  resume: 'Resume',
  identification: 'ID/Driver\'s License',
  certification: 'Certification',
  other: 'Other Document',
};

// Status display colors for UI
export const STATUS_COLORS: Record<PhaseStatus, string> = {
  not_started: 'text-muted-foreground bg-muted',
  in_progress: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950',
  completed: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950',
  blocked: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950',
};

// Colors for each onboarding status/phase - progresses from cool to warm colors
export const ONBOARDING_STATUS_COLORS: Record<OnboardingStatus, string> = {
  interview_1: 'text-slate-700 bg-slate-100 dark:text-slate-400 dark:bg-slate-950',
  zoom_interview: 'text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-950',
  pre_licensing: 'text-indigo-700 bg-indigo-100 dark:text-indigo-400 dark:bg-indigo-950',
  exam: 'text-purple-700 bg-purple-100 dark:text-purple-400 dark:bg-purple-950',
  npn_received: 'text-violet-700 bg-violet-100 dark:text-violet-400 dark:bg-violet-950',
  contracting: 'text-amber-700 bg-amber-100 dark:text-amber-400 dark:bg-amber-950',
  bootcamp: 'text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-950',
  completed: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950',
  dropped: 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-950',
};

// ========================================
// NEW PIPELINE SYSTEM TYPES
// ========================================

export type ChecklistItemType =
  | 'document_upload'
  | 'task_completion'
  | 'training_module'
  | 'manual_approval'
  | 'automated_check'
  | 'signature_required';

export type ChecklistItemStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'approved'
  | 'rejected'
  | 'needs_resubmission';

export type PhaseProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export type RequiredApproverRole = 'upline' | 'admin' | 'system';

export type CompletedBy = 'recruit' | 'upline' | 'system';

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelinePhase {
  id: string;
  template_id: string;
  phase_name: string;
  phase_description: string | null;
  phase_order: number;
  estimated_days: number | null;
  auto_advance: boolean;
  required_approver_role: RequiredApproverRole | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PhaseChecklistItem {
  id: string;
  phase_id: string;
  item_type: ChecklistItemType;
  item_name: string;
  item_description: string | null;
  item_order: number;
  is_required: boolean;
  can_be_completed_by: CompletedBy;
  requires_verification: boolean;
  verification_by: 'upline' | 'system' | null;
  external_link: string | null;
  document_type: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface RecruitPhaseProgress {
  id: string;
  user_id: string;
  phase_id: string;
  template_id: string;
  status: PhaseProgressStatus;
  started_at: string | null;
  completed_at: string | null;
  blocked_reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecruitChecklistProgress {
  id: string;
  user_id: string;
  checklist_item_id: string;
  status: ChecklistItemStatus;
  completed_at: string | null;
  completed_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  document_id: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Input types for creating/updating pipeline entities

export interface CreateTemplateInput {
  name: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  is_active?: boolean;
  is_default?: boolean;
}

export interface CreatePhaseInput {
  phase_name: string;
  phase_description?: string;
  phase_order?: number;
  estimated_days?: number;
  auto_advance?: boolean;
  required_approver_role?: RequiredApproverRole;
  is_active?: boolean;
}

export interface UpdatePhaseInput {
  phase_name?: string;
  phase_description?: string;
  phase_order?: number;
  estimated_days?: number;
  auto_advance?: boolean;
  required_approver_role?: RequiredApproverRole;
  is_active?: boolean;
}

export interface CreateChecklistItemInput {
  item_type: ChecklistItemType;
  item_name: string;
  item_description?: string;
  item_order?: number;
  is_required?: boolean;
  can_be_completed_by?: CompletedBy;
  requires_verification?: boolean;
  verification_by?: 'upline' | 'system';
  external_link?: string;
  document_type?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateChecklistItemInput {
  item_type?: ChecklistItemType;
  item_name?: string;
  item_description?: string;
  item_order?: number;
  is_required?: boolean;
  can_be_completed_by?: CompletedBy;
  requires_verification?: boolean;
  verification_by?: 'upline' | 'system';
  external_link?: string;
  document_type?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateChecklistItemStatusInput {
  status: ChecklistItemStatus;
  completed_by?: string;
  verified_by?: string;
  rejection_reason?: string;
  document_id?: string;
  notes?: string;
  metadata?: Record<string, unknown>;
}

// Display names for checklist item types
export const CHECKLIST_ITEM_TYPE_DISPLAY_NAMES: Record<ChecklistItemType, string> = {
  document_upload: 'Document Upload',
  task_completion: 'Task Completion',
  training_module: 'Training Module',
  manual_approval: 'Manual Approval',
  automated_check: 'Automated Check',
  signature_required: 'Signature Required',
};

// Status icons for checklist items
export const CHECKLIST_STATUS_ICONS: Record<ChecklistItemStatus, string> = {
  not_started: '⚪',
  in_progress: '🟡',
  completed: '✅',
  approved: '✅',
  rejected: '❌',
  needs_resubmission: '🔄',
};

// Status colors for checklist items
export const CHECKLIST_STATUS_COLORS: Record<ChecklistItemStatus, string> = {
  not_started: 'text-muted-foreground bg-muted',
  in_progress: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950',
  completed: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950',
  approved: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950',
  rejected: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950',
  needs_resubmission: 'text-orange-700 bg-orange-100 dark:text-orange-400 dark:bg-orange-950',
};

// Status icons for phase progress
export const PHASE_PROGRESS_ICONS: Record<PhaseProgressStatus, string> = {
  not_started: '⚪',
  in_progress: '🟡',
  completed: '✅',
  blocked: '🔴',
  skipped: '⏭️',
};

// Status colors for phase progress
export const PHASE_PROGRESS_COLORS: Record<PhaseProgressStatus, string> = {
  not_started: 'text-muted-foreground bg-muted',
  in_progress: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950',
  completed: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950',
  blocked: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950',
  skipped: 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-950',
};
