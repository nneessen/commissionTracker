// src/types/recruiting.types.ts

import type { Database } from "./database.types";
import type { DocumentStatus as DocStatus } from "./documents.types";

// Re-export document types from dedicated module
export type {
  DocumentCategory,
  InsuranceDocumentType,
  DocumentStatus,
} from "./documents.types";

// Local alias for use within this file
type DocumentStatus = DocStatus;
export {
  DOCUMENT_CATEGORIES,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_EXPIRATION_DEFAULTS,
  DOCUMENT_CATEGORY_ORDER,
  getCategoryForDocumentType,
  getAllDocumentTypes,
  getDocumentTypesForCategory,
  getSuggestedExpirationDate,
  isValidDocumentType,
  isValidDocumentCategory,
} from "./documents.types";

// Legacy alias for backward compatibility
export type { InsuranceDocumentType as DocumentType } from "./documents.types";

export type AgentStatus = Database["public"]["Enums"]["agent_status"];

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
  visible_to_recruit: boolean;
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic metadata shape
  metadata?: Record<string, any> | null;
  is_active: boolean;
  visible_to_recruit: boolean;
}

export interface RecruitPhaseProgress {
  id: string;
  user_id: string;
  phase_id: string;
  template_id: string;
  status: "not_started" | "in_progress" | "completed" | "blocked" | "skipped";
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
  status:
    | "not_started"
    | "pending"
    | "in_progress"
    | "completed"
    | "verified"
    | "approved"
    | "rejected"
    | "needs_resubmission";
  completed_at: string | null;
  completed_by: string | null;
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  notes: string | null;
  document_id?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic metadata shape
  metadata?: Record<string, any> | null;
}

// Type guards
export function isLicensedAgent(
  status: AgentStatus | null | undefined,
): boolean {
  return status === "licensed";
}

export function requiresPipeline(
  status: AgentStatus | null | undefined,
): boolean {
  return status === "unlicensed" || status === "licensed";
}

export function shouldSkipPipeline(
  status: AgentStatus | null | undefined,
): boolean {
  return status === "not_applicable";
}

// Status color mappings for UI badges
export const ONBOARDING_STATUS_COLORS: Record<string, string> = {
  interview_1: "bg-blue-100 text-blue-800",
  interview_2: "bg-blue-100 text-blue-800",
  contracting: "bg-purple-100 text-purple-800",
  licensing: "bg-yellow-100 text-yellow-800",
  training: "bg-orange-100 text-orange-800",
  active: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
  withdrawn: "bg-gray-100 text-gray-800",
};

export const CHECKLIST_STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-600",
  pending: "bg-gray-100 text-gray-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  verified: "bg-emerald-100 text-emerald-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  needs_resubmission: "bg-amber-100 text-amber-800",
};

// =============================================================================
// Additional Types (migrated from recruiting.ts)
// =============================================================================

// OnboardingStatus mirrors pipeline phases
export type OnboardingStatus =
  | "interview_1"
  | "zoom_interview"
  | "pre_licensing"
  | "exam"
  | "npn_received"
  | "contracting"
  | "bootcamp"
  | "completed"
  | "dropped";

// PhaseName matches database pipeline_phases.phase_name values
export type PhaseName =
  | "Interview 1"
  | "Zoom Interview"
  | "Pre-Licensing"
  | "Exam"
  | "NPN Received"
  | "Contracting"
  | "Bootcamp";

export type PhaseStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked";
export type PhaseProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked"
  | "skipped";
export type ChecklistItemStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "approved"
  | "rejected"
  | "needs_resubmission";
export type ChecklistItemType =
  | "document_upload"
  | "task_completion"
  | "training_module"
  | "manual_approval"
  | "automated_check"
  | "signature_required"
  | "scheduling_booking";
export type CompletedBy = "recruit" | "upline" | "system";
export type RequiredApproverRole = "upline" | "admin" | "system";

// DocumentType and DocumentStatus are now imported from documents.types.ts
// and re-exported at the top of this file for backward compatibility
export type EmailStatus =
  | "draft"
  | "sending"
  | "sent"
  | "delivered"
  | "opened"
  | "failed";

export type ActivityAction =
  | "created"
  | "updated"
  | "deleted"
  | "phase_changed"
  | "document_uploaded"
  | "document_approved"
  | "document_rejected"
  | "email_sent"
  | "status_changed"
  | "note_added"
  | "other";

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
  document_type: string; // Uses InsuranceDocumentType values but stored as string in DB
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
  onboarding_status?: OnboardingStatus;
}

export interface UpdatePhaseInput {
  phase_name?: string;
  phase_description?: string;
  phase_order?: number;
  estimated_days?: number;
  auto_advance?: boolean;
  required_approver_role?: RequiredApproverRole;
  is_active?: boolean;
  visible_to_recruit?: boolean;
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
  visible_to_recruit?: boolean;
}

export interface CreateChecklistItemInput {
  item_type: ChecklistItemType;
  item_name: string;
  item_description?: string;
  item_order?: number;
  is_required?: boolean;
  is_active?: boolean;
  visible_to_recruit?: boolean;
  can_be_completed_by?: CompletedBy;
  requires_verification?: boolean;
  verification_by?: "upline" | "system";
  external_link?: string;
  document_type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic metadata shape
  metadata?: Record<string, any>;
}

export interface UpdateChecklistItemInput {
  item_type?: ChecklistItemType;
  item_name?: string;
  item_description?: string;
  item_order?: number;
  is_required?: boolean;
  is_active?: boolean;
  visible_to_recruit?: boolean;
  can_be_completed_by?: CompletedBy;
  requires_verification?: boolean;
  verification_by?: "upline" | "system";
  external_link?: string;
  document_type?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic metadata shape
  metadata?: Record<string, any>;
}

export interface UpdateChecklistItemStatusInput {
  status: ChecklistItemStatus;
  completed_by?: string;
  verified_by?: string;
  rejection_reason?: string;
  document_id?: string;
  notes?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic metadata shape
  metadata?: Record<string, any>;
}

// Display name mappings
export const PHASE_DISPLAY_NAMES: Record<PhaseName, string> = {
  "Interview 1": "Interview 1",
  "Zoom Interview": "Zoom Interview",
  "Pre-Licensing": "Pre-Licensing",
  Exam: "Exam",
  "NPN Received": "NPN Received",
  Contracting: "Contracting",
  Bootcamp: "Bootcamp",
};

export const CHECKLIST_ITEM_TYPE_DISPLAY_NAMES: Record<
  ChecklistItemType,
  string
> = {
  document_upload: "Document Upload",
  task_completion: "Task Completion",
  training_module: "Training Module",
  manual_approval: "Manual Approval",
  automated_check: "Automated Check",
  signature_required: "Signature Required",
  scheduling_booking: "Schedule Booking",
};

// Status icons
export const PHASE_PROGRESS_ICONS: Record<PhaseProgressStatus, string> = {
  not_started: "⚪",
  in_progress: "🟡",
  completed: "✅",
  blocked: "🔴",
  skipped: "⏭️",
};

export const PHASE_PROGRESS_COLORS: Record<PhaseProgressStatus, string> = {
  not_started: "text-muted-foreground bg-muted",
  in_progress:
    "text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-950",
  completed:
    "text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-950",
  blocked: "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-950",
  skipped: "text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-950",
};

// =============================================================================
// Pipeline Automation Types
// =============================================================================

export type AutomationTriggerType =
  | "phase_enter"
  | "phase_complete"
  | "phase_stall"
  | "item_complete"
  | "item_approval_needed"
  | "item_deadline_approaching";

export type AutomationRecipientType =
  | "recruit"
  | "upline"
  | "trainer"
  | "contracting_manager"
  | "custom_email";

export type AutomationCommunicationType =
  | "email"
  | "notification"
  | "sms"
  | "both"
  | "all";

export type AutomationSenderType =
  | "system"
  | "upline"
  | "trainer"
  | "contracting_manager"
  | "custom";

export interface RecipientConfig {
  type: AutomationRecipientType;
  emails?: string[]; // Only for custom_email type
}

export interface PipelineAutomation {
  id: string;
  phase_id: string | null;
  checklist_item_id: string | null;
  trigger_type: AutomationTriggerType;
  communication_type: AutomationCommunicationType;
  delay_days: number | null;
  recipients: RecipientConfig[];
  email_template_id: string | null;
  email_subject: string | null;
  email_body_html: string | null;
  notification_title: string | null;
  notification_message: string | null;
  sms_message: string | null;
  sender_type: AutomationSenderType | null;
  sender_email: string | null;
  sender_name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PipelineAutomationLog {
  id: string;
  automation_id: string;
  recruit_id: string;
  triggered_at: string;
  status: "pending" | "sent" | "failed" | "skipped";
  error_message: string | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateAutomationInput {
  phase_id?: string;
  checklist_item_id?: string;
  trigger_type: AutomationTriggerType;
  communication_type?: AutomationCommunicationType;
  delay_days?: number;
  recipients: RecipientConfig[];
  email_template_id?: string;
  email_subject?: string;
  email_body_html?: string;
  notification_title?: string;
  notification_message?: string;
  sms_message?: string;
  sender_type?: AutomationSenderType;
  sender_email?: string;
  sender_name?: string;
}

export interface UpdateAutomationInput extends Partial<CreateAutomationInput> {
  is_active?: boolean;
}

// Display labels for automation triggers
export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTriggerType, string> =
  {
    phase_enter: "On Phase Enter",
    phase_complete: "On Phase Complete",
    phase_stall: "Phase Stall Reminder",
    item_complete: "On Item Complete",
    item_approval_needed: "Approval Request",
    item_deadline_approaching: "Deadline Reminder",
  };

export const AUTOMATION_RECIPIENT_LABELS: Record<
  AutomationRecipientType,
  string
> = {
  recruit: "Recruit",
  upline: "Upline/Recruiter",
  trainer: "Trainer",
  contracting_manager: "Contracting Manager",
  custom_email: "Custom Email",
};

export const AUTOMATION_COMMUNICATION_LABELS: Record<
  AutomationCommunicationType,
  string
> = {
  email: "Email Only",
  notification: "In-App Notification",
  sms: "SMS Only",
  both: "Email + Notification",
  all: "Email + SMS + Notification",
};

// Helper to check if trigger is phase-level
export function isPhaseAutomation(trigger: AutomationTriggerType): boolean {
  return ["phase_enter", "phase_complete", "phase_stall"].includes(trigger);
}

// Helper to check if trigger is item-level
export function isItemAutomation(trigger: AutomationTriggerType): boolean {
  return [
    "item_complete",
    "item_approval_needed",
    "item_deadline_approaching",
  ].includes(trigger);
}

// Short trigger labels for compact UI display
export const PHASE_TRIGGER_SHORT_LABELS: Record<string, string> = {
  phase_enter: "On Enter",
  phase_complete: "On Complete",
  phase_stall: "Stall Reminder",
};

export const ITEM_TRIGGER_SHORT_LABELS: Record<string, string> = {
  item_complete: "On Complete",
  item_approval_needed: "Approval Request",
  item_deadline_approaching: "Deadline Reminder",
};

// Combined short labels for all triggers
export const TRIGGER_SHORT_LABELS: Record<string, string> = {
  ...PHASE_TRIGGER_SHORT_LABELS,
  ...ITEM_TRIGGER_SHORT_LABELS,
};
