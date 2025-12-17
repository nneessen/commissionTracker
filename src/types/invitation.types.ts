// src/types/invitation.types.ts
// Type definitions for hierarchy invitation system

/**
 * Invitation status values
 */
export type InvitationStatus =
  | "pending"
  | "accepted"
  | "denied"
  | "cancelled"
  | "expired";

/**
 * Core invitation record from database
 */
export interface HierarchyInvitation {
  id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_id: string | null;
  status: InvitationStatus;
  message: string | null;
  created_at: string;
  expires_at: string;
  responded_at: string | null;
  updated_at: string;
}

/**
 * Request to send a new invitation
 * Only requires email address
 */
export interface SendInvitationRequest {
  invitee_email: string;
  message?: string; // Optional message from inviter
}

/**
 * Response after sending invitation
 */
export interface SendInvitationResponse {
  success: boolean;
  invitation?: HierarchyInvitation;
  error?: string;
  warnings?: string[];
}

/**
 * Request to accept an invitation
 */
export interface AcceptInvitationRequest {
  invitation_id: string;
}

/**
 * Response after accepting invitation
 */
export interface AcceptInvitationResponse {
  success: boolean;
  invitation?: HierarchyInvitation;
  error?: string;
}

/**
 * Request to deny an invitation
 */
export interface DenyInvitationRequest {
  invitation_id: string;
}

/**
 * Request to cancel an invitation (inviter side)
 */
export interface CancelInvitationRequest {
  invitation_id: string;
}

/**
 * Request to resend an invitation (inviter side)
 */
export interface ResendInvitationRequest {
  invitation_id: string;
}

/**
 * Invitation with additional display info
 * Used in UI components
 */
export interface InvitationWithDetails extends HierarchyInvitation {
  inviter_email?: string; // For invitees to see who invited them
  inviter_hierarchy_depth?: number;
  invitee_has_downlines?: boolean; // Validation check
  invitee_has_upline?: boolean; // Validation check
  is_expired?: boolean; // Computed from expires_at
  can_accept?: boolean; // Computed validation
}

/**
 * Summary stats for invitations
 */
export interface InvitationStats {
  sent_pending: number;
  sent_accepted: number;
  sent_denied: number;
  sent_cancelled: number;
  received_pending: number;
  received_expired: number;
}

/**
 * Validation result for sending invitation
 */
export interface InvitationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  inviteeuser_id?: string; // Resolved user ID if found
}
