// src/types/recruiting.types.ts

import type {Database} from './database.types';

export type AgentStatus = Database['public']['Enums']['agent_status'];

export interface LicensingInfo {
  licenseNumber?: string;
  npn?: string; // National Producer Number
  licenseExpirationDate?: string;
  licenseState?: string;
  licenseType?: string;
  yearsLicensed?: number;
  previousCarriers?: string[];
  specializations?: string[];
}

export interface CreateRecruitInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  upline_id?: string;
  recruiter_id?: string;
  referral_source?: string;
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  date_of_birth?: string;
  // New fields for licensing status
  agent_status?: AgentStatus;
  licensing_info?: LicensingInfo;
  pipeline_template_id?: string;
  // Skip pipeline for certain roles
  skip_pipeline?: boolean;
  // Optional role override for admin/non-agent users
  roles?: string[];
  is_admin?: boolean;
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PipelinePhase {
  id: string;
  template_id: string;
  phase_name: string;
  phase_description: string | null;
  phase_order: number;
  estimated_days: number | null;
  auto_advance: boolean;
  required_approver_role: string | null;
  is_active: boolean;
}

export interface PhaseChecklistItem {
  id: string;
  phase_id: string;
  item_name: string;
  item_description: string | null;
  item_type: string;
  item_order: number;
  is_required: boolean;
  can_be_completed_by: string;
  requires_verification: boolean;
  verification_by: string | null;
  document_type?: string | null;
  external_link?: string | null;
  metadata?: Record<string, any> | null;
  is_active: boolean;
}

export interface RecruitPhaseProgress {
  id: string;
  user_id: string;
  phase_id: string;
  template_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
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
  status: 'pending' | 'in_progress' | 'completed' | 'verified' | 'rejected';
  completed_at: string | null;
  completed_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  document_id?: string | null;
  metadata?: Record<string, any> | null;
}

// Type guards
export function isLicensedAgent(status: AgentStatus | null | undefined): boolean {
  return status === 'licensed';
}

export function requiresPipeline(status: AgentStatus | null | undefined): boolean {
  return status === 'unlicensed' || status === 'licensed';
}

export function shouldSkipPipeline(status: AgentStatus | null | undefined): boolean {
  return status === 'not_applicable';
}

// Status color mappings for UI badges
export const ONBOARDING_STATUS_COLORS: Record<string, string> = {
  interview_1: 'bg-blue-100 text-blue-800',
  interview_2: 'bg-blue-100 text-blue-800',
  contracting: 'bg-purple-100 text-purple-800',
  licensing: 'bg-yellow-100 text-yellow-800',
  training: 'bg-orange-100 text-orange-800',
  active: 'bg-green-100 text-green-800',
  completed: 'bg-green-100 text-green-800',
  blocked: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};

export const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  verified: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

// =============================================================================
// Additional Types (migrated from recruiting.ts)
// =============================================================================

// OnboardingStatus mirrors pipeline phases
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
export type PhaseProgressStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
export type ChecklistItemStatus = 'not_started' | 'in_progress' | 'completed' | 'approved' | 'rejected' | 'needs_resubmission';
export type ChecklistItemType = 'document_upload' | 'task_completion' | 'training_module' | 'manual_approval' | 'automated_check' | 'signature_required';
export type CompletedBy = 'recruit' | 'upline' | 'system';
export type RequiredApproverRole = 'upline' | 'admin' | 'system';

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

// Entity interfaces
export interface OnboardingPhase {
  id: string;
  user_id: string;
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
  user_id: string;
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
  user_id: string;
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
  user_id: string;
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
  search?: string;
  date_range?: {
    start: string;
    end: string;
  };
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
  street_address?: string;
  city?: string;
  state?: string;
  zip?: string;
  date_of_birth?: string;
  resident_state?: string;
  license_number?: string;
  npn?: string;
  license_expiration?: string;
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

// Pipeline CRUD types
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

// Display name mappings
export const PHASE_DISPLAY_NAMES: Record<PhaseName, string> = {
  'Interview 1': 'Interview 1',
  'Zoom Interview': 'Zoom Interview',
  'Pre-Licensing': 'Pre-Licensing',
  'Exam': 'Exam',
  'NPN Received': 'NPN Received',
  'Contracting': 'Contracting',
  'Bootcamp': 'Bootcamp',
};

export const CHECKLIST_ITEM_TYPE_DISPLAY_NAMES: Record<ChecklistItemType, string> = {
  document_upload: 'Document Upload',
  task_completion: 'Task Completion',
  training_module: 'Training Module',
  manual_approval: 'Manual Approval',
  automated_check: 'Automated Check',
  signature_required: 'Signature Required',
};

// Status icons
export const PHASE_PROGRESS_ICONS: Record<PhaseProgressStatus, string> = {
  not_started: '⚪',
  in_progress: '🟡',
  completed: '✅',
  blocked: '🔴',
  skipped: '⏭️',
};

export const PHASE_PROGRESS_COLORS: Record<PhaseProgressStatus, string> = {
  not_started: 'text-muted-foreground bg-muted',
  in_progress: 'text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950',
  completed: 'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950',
  blocked: 'text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950',
  skipped: 'text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-950',
};