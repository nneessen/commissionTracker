// src/types/signature.types.ts
// TypeScript types for DocuSeal e-signature integration

import type { Database } from "./database.types";

// =============================================================================
// Database Row Types
// =============================================================================

export type SignatureTemplateRow =
  Database["public"]["Tables"]["signature_templates"]["Row"];
export type SignatureTemplateInsert =
  Database["public"]["Tables"]["signature_templates"]["Insert"];
export type SignatureTemplateUpdate =
  Database["public"]["Tables"]["signature_templates"]["Update"];

export type SignatureSubmissionRow =
  Database["public"]["Tables"]["signature_submissions"]["Row"];
export type SignatureSubmissionInsert =
  Database["public"]["Tables"]["signature_submissions"]["Insert"];
export type SignatureSubmissionUpdate =
  Database["public"]["Tables"]["signature_submissions"]["Update"];

export type SignatureSubmitterRow =
  Database["public"]["Tables"]["signature_submitters"]["Row"];
export type SignatureSubmitterInsert =
  Database["public"]["Tables"]["signature_submitters"]["Insert"];
export type SignatureSubmitterUpdate =
  Database["public"]["Tables"]["signature_submitters"]["Update"];

// =============================================================================
// Enums & Constants
// =============================================================================

export type SignatureTemplateType =
  | "agent_contract"
  | "independent_agreement"
  | "custom"
  | "user_signup";

export type SignerRole =
  | "recruit"
  | "recruiter"
  | "agency_owner"
  | "witness"
  | "custom";

export type SigningOrder = "any" | "sequential";

export type SubmissionStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "declined"
  | "expired"
  | "voided";

export type SubmitterStatus =
  | "pending"
  | "sent"
  | "opened"
  | "completed"
  | "declined";

// Display labels
export const TEMPLATE_TYPE_LABELS: Record<SignatureTemplateType, string> = {
  agent_contract: "Agent Contract",
  independent_agreement: "Independent Agent Agreement",
  custom: "Custom Document",
  user_signup: "User Signup Agreement",
};

export const SIGNER_ROLE_LABELS: Record<SignerRole, string> = {
  recruit: "Recruit",
  recruiter: "Recruiter",
  agency_owner: "Agency Owner",
  witness: "Witness",
  custom: "Custom Signer",
};

export const SIGNING_ORDER_LABELS: Record<SigningOrder, string> = {
  any: "Any Order (Parallel)",
  sequential: "Sequential Order",
};

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  declined: "Declined",
  expired: "Expired",
  voided: "Voided",
};

export const SUBMITTER_STATUS_LABELS: Record<SubmitterStatus, string> = {
  pending: "Awaiting Signature",
  sent: "Email Sent",
  opened: "Viewed",
  completed: "Signed",
  declined: "Declined",
};

// Status colors for UI
export const SUBMISSION_STATUS_COLORS: Record<SubmissionStatus, string> = {
  pending: "bg-gray-100 text-gray-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
  expired: "bg-amber-100 text-amber-700",
  voided: "bg-gray-100 text-gray-500",
};

export const SUBMITTER_STATUS_COLORS: Record<SubmitterStatus, string> = {
  pending: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-600",
  opened: "bg-amber-100 text-amber-600",
  completed: "bg-green-100 text-green-600",
  declined: "bg-red-100 text-red-600",
};

// =============================================================================
// Entity Interfaces (Camel-cased for application use)
// =============================================================================

export interface SignatureTemplate {
  id: string;
  agencyId: string;
  imoId: string | null;
  name: string;
  description: string | null;
  templateType: SignatureTemplateType;
  docusealTemplateId: number | null;
  docusealTemplateSlug: string | null;
  requiredSignerRoles: SignerRole[];
  signingOrder: SigningOrder;
  isActive: boolean;
  createdBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SignatureSubmission {
  id: string;
  agencyId: string;
  imoId: string | null;
  templateId: string;
  docusealSubmissionId: number | null;
  status: SubmissionStatus;
  initiatedBy: string | null;
  targetUserId: string | null;
  checklistProgressId: string | null;
  auditLogUrl: string | null;
  combinedDocumentUrl: string | null;
  expiresAt: string | null;
  completedAt: string | null;
  declinedAt: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  voidedReason: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface SignatureSubmitter {
  id: string;
  submissionId: string;
  userId: string | null;
  docusealSubmitterId: number | null;
  role: SignerRole;
  email: string;
  name: string | null;
  signingOrder: number;
  status: SubmitterStatus;
  embedUrl: string | null;
  embedUrlExpiresAt: string | null;
  signedAt: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  sentAt: string | null;
  openedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// =============================================================================
// Create/Update Input Types
// =============================================================================

export interface CreateSignatureTemplateInput {
  agencyId: string;
  imoId?: string;
  name: string;
  description?: string;
  templateType: SignatureTemplateType;
  docusealTemplateId?: number;
  docusealTemplateSlug?: string;
  requiredSignerRoles?: SignerRole[];
  signingOrder?: SigningOrder;
  createdBy?: string;
}

export interface UpdateSignatureTemplateInput {
  name?: string;
  description?: string;
  templateType?: SignatureTemplateType;
  docusealTemplateId?: number;
  docusealTemplateSlug?: string;
  requiredSignerRoles?: SignerRole[];
  signingOrder?: SigningOrder;
  isActive?: boolean;
}

export interface CreateSignatureSubmissionInput {
  agencyId: string;
  imoId?: string;
  templateId: string;
  targetUserId?: string;
  checklistProgressId?: string;
  initiatedBy?: string;
  expiresAt?: string;
}

export interface UpdateSignatureSubmissionInput {
  docusealSubmissionId?: number;
  status?: SubmissionStatus;
  auditLogUrl?: string;
  combinedDocumentUrl?: string;
  completedAt?: string;
  declinedAt?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidedReason?: string;
}

export interface CreateSignatureSubmitterInput {
  submissionId: string;
  userId?: string;
  role: SignerRole;
  email: string;
  name?: string;
  signingOrder?: number;
}

export interface UpdateSignatureSubmitterInput {
  docusealSubmitterId?: number;
  status?: SubmitterStatus;
  embedUrl?: string;
  embedUrlExpiresAt?: string;
  signedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  ipAddress?: string;
  userAgent?: string;
  sentAt?: string;
  openedAt?: string;
}

// =============================================================================
// Checklist Integration Types (for phase_checklist_items.metadata)
// =============================================================================

export interface SignatureRequiredMetadata {
  template_id: string; // signature_templates.id
  required_signer_roles: SignerRole[];
  signing_order: SigningOrder;
  custom_message?: string; // Optional message to display to signers
  auto_send?: boolean; // Auto-send when phase starts
  expires_in_days?: number; // Number of days until expiration
}

// Response data stored in recruit_checklist_progress.response_data
export interface SignatureRequiredResponse {
  submission_id: string; // signature_submissions.id
  docuseal_submission_id: number;
  status: SubmissionStatus;
  signers: SignatureSubmitterSummary[];
  audit_log_url?: string;
  combined_document_url?: string;
  completed_at?: string;
  initiated_at: string;
}

export interface SignatureSubmitterSummary {
  role: SignerRole;
  user_id: string | null;
  email: string;
  name: string | null;
  status: SubmitterStatus;
  signed_at?: string;
  declined_at?: string;
}

// =============================================================================
// DocuSeal API Types
// =============================================================================

// DocuSeal API response types for creating submissions
export interface DocuSealSubmission {
  id: number;
  submission_events: DocuSealSubmissionEvent[];
  submitters: DocuSealSubmitter[];
  template: {
    id: number;
    name: string;
  };
  audit_log_url: string;
  combined_document_url?: string;
  created_at: string;
  completed_at?: string;
  status: string;
}

export interface DocuSealSubmitter {
  id: number;
  uuid: string;
  email: string;
  name?: string;
  role: string;
  embed_src: string;
  status: string;
  opened_at?: string;
  completed_at?: string;
  declined_at?: string;
  decline_reason?: string;
}

export interface DocuSealSubmissionEvent {
  id: number;
  event_type: string;
  event_timestamp: string;
  submitter?: {
    id: number;
    email: string;
  };
}

export interface DocuSealTemplate {
  id: number;
  slug: string;
  name: string;
  created_at: string;
  updated_at: string;
  fields: DocuSealField[];
}

export interface DocuSealField {
  name: string;
  type: string;
  required: boolean;
  submitter_uuid?: string;
}

// Request types for DocuSeal API
export interface CreateDocuSealSubmissionRequest {
  template_id: number;
  submitters: CreateDocuSealSubmitterRequest[];
  send_email?: boolean;
  send_sms?: boolean;
  message?: {
    subject?: string;
    body?: string;
  };
  expire_at?: string;
}

export interface CreateDocuSealSubmitterRequest {
  email: string;
  name?: string;
  role?: string;
  phone?: string;
  values?: Record<string, string>;
  readonly_fields?: string[];
  metadata?: Record<string, unknown>;
  send_email?: boolean;
  send_sms?: boolean;
}

// Webhook event types from DocuSeal
export interface DocuSealWebhookEvent {
  event_type:
    | "form.completed"
    | "form.declined"
    | "form.opened"
    | "submission.completed";
  timestamp: string;
  data: {
    id: number;
    submission_id: number;
    submitter_id?: number;
    email?: string;
    name?: string;
    status: string;
    completed_at?: string;
    declined_at?: string;
    decline_reason?: string;
    audit_log_url?: string;
    documents?: {
      url: string;
      filename: string;
    }[];
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Type guard for SignatureTemplateType
 */
export function isValidTemplateType(
  type: string,
): type is SignatureTemplateType {
  return [
    "agent_contract",
    "independent_agreement",
    "custom",
    "user_signup",
  ].includes(type);
}

/**
 * Type guard for SignerRole
 */
export function isValidSignerRole(role: string): role is SignerRole {
  return ["recruit", "recruiter", "agency_owner", "witness", "custom"].includes(
    role,
  );
}

/**
 * Type guard for SubmissionStatus
 */
export function isValidSubmissionStatus(
  status: string,
): status is SubmissionStatus {
  return [
    "pending",
    "in_progress",
    "completed",
    "declined",
    "expired",
    "voided",
  ].includes(status);
}

/**
 * Type guard for SubmitterStatus
 */
export function isValidSubmitterStatus(
  status: string,
): status is SubmitterStatus {
  return ["pending", "sent", "opened", "completed", "declined"].includes(
    status,
  );
}

/**
 * Check if a submission is in a terminal state
 */
export function isSubmissionTerminal(status: SubmissionStatus): boolean {
  return ["completed", "declined", "expired", "voided"].includes(status);
}

/**
 * Check if all submitters have completed signing
 */
export function areAllSubmittersSigned(
  submitters: SignatureSubmitter[],
): boolean {
  return submitters.every((s) => s.status === "completed");
}

/**
 * Check if any submitter has declined
 */
export function hasAnySubmitterDeclined(
  submitters: SignatureSubmitter[],
): boolean {
  return submitters.some((s) => s.status === "declined");
}

/**
 * Get the current signer (for sequential signing)
 */
export function getCurrentSigner(
  submitters: SignatureSubmitter[],
): SignatureSubmitter | null {
  const sortedByOrder = [...submitters].sort(
    (a, b) => a.signingOrder - b.signingOrder,
  );
  return (
    sortedByOrder.find(
      (s) => s.status !== "completed" && s.status !== "declined",
    ) || null
  );
}
