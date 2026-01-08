// src/types/linkedin.types.ts
// TypeScript types for LinkedIn DM integration via Unipile

// ============================================================================
// Enum Types
// ============================================================================

export type LinkedInConnectionStatus =
  | "connected"
  | "disconnected"
  | "credentials" // Needs reconnection (Unipile session expired)
  | "error";

export type LinkedInMessageType =
  | "text"
  | "media"
  | "inmail"
  | "invitation_message";

// Reuse from Instagram
export type MessageDirection = "inbound" | "outbound";
export type ScheduledMessageStatus =
  | "pending"
  | "sent"
  | "cancelled"
  | "failed"
  | "expired";

// Reuse InstagramMessageStatus for delivery tracking
export type LinkedInMessageStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

// LinkedIn account types
export type LinkedInAccountType =
  | "LINKEDIN"
  | "LINKEDIN_RECRUITER"
  | "LINKEDIN_SALES_NAV";

// ============================================================================
// Database Row Types
// ============================================================================

export interface LinkedInIntegrationRow {
  id: string;
  imo_id: string;
  user_id: string;
  unipile_account_id: string;
  account_type: string;
  linkedin_profile_id: string | null;
  linkedin_username: string | null;
  linkedin_display_name: string | null;
  linkedin_headline: string | null;
  linkedin_profile_url: string | null;
  linkedin_profile_picture_url: string | null;
  connection_status: LinkedInConnectionStatus;
  is_active: boolean;
  last_connected_at: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  last_error_at: string | null;
  api_calls_this_hour: number;
  api_calls_reset_at: string | null;
  billing_started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LinkedInConversationRow {
  id: string;
  integration_id: string;
  unipile_chat_id: string;
  participant_linkedin_id: string;
  participant_username: string | null;
  participant_name: string | null;
  participant_headline: string | null;
  participant_profile_picture_url: string | null;
  participant_profile_url: string | null;
  participant_email: string | null;
  participant_phone: string | null;
  contact_notes: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_direction: MessageDirection | null;
  unread_count: number;
  is_connection: boolean;
  connection_degree: number | null;
  connection_request_sent_at: string | null;
  connection_request_message: string | null;
  is_priority: boolean;
  priority_set_at: string | null;
  priority_set_by: string | null;
  priority_notes: string | null;
  recruiting_lead_id: string | null;
  auto_reminder_enabled: boolean;
  auto_reminder_template_id: string | null;
  auto_reminder_hours: number;
  created_at: string;
  updated_at: string;
}

export interface LinkedInMessageRow {
  id: string;
  conversation_id: string;
  unipile_message_id: string;
  message_text: string | null;
  message_type: LinkedInMessageType;
  media_url: string | null;
  media_type: string | null;
  direction: MessageDirection;
  status: LinkedInMessageStatus;
  sender_linkedin_id: string;
  sender_name: string | null;
  sent_at: string;
  delivered_at: string | null;
  read_at: string | null;
  template_id: string | null;
  scheduled_message_id: string | null;
  created_at: string;
}

export interface LinkedInScheduledMessageRow {
  id: string;
  conversation_id: string;
  message_text: string;
  template_id: string | null;
  scheduled_for: string;
  scheduled_by: string;
  valid_until: string | null;
  status: ScheduledMessageStatus;
  sent_at: string | null;
  sent_message_id: string | null;
  error_message: string | null;
  retry_count: number;
  is_auto_reminder: boolean;
  created_at: string;
  updated_at: string;
}

export interface LinkedInUsageTrackingRow {
  id: string;
  imo_id: string;
  user_id: string;
  period_start: string;
  period_end: string;
  messages_sent: number;
  messages_received: number;
  api_calls_made: number;
  scheduled_messages_sent: number;
  templates_used: number;
  inmails_sent: number;
  connection_requests_sent: number;
  created_at: string;
  updated_at: string;
}

export interface UnipileConfigRow {
  id: string;
  imo_id: string;
  api_key_encrypted: string;
  dsn: string;
  webhook_secret: string | null;
  monthly_account_limit: number;
  current_account_count: number;
  linkedin_enabled: boolean;
  whatsapp_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Insert Types
// ============================================================================

export type LinkedInIntegrationInsert = Omit<
  LinkedInIntegrationRow,
  | "id"
  | "created_at"
  | "updated_at"
  | "api_calls_this_hour"
  | "api_calls_reset_at"
  | "billing_started_at"
>;

export type LinkedInConversationInsert = Omit<
  LinkedInConversationRow,
  "id" | "created_at" | "updated_at" | "unread_count"
>;

export type LinkedInMessageInsert = Omit<
  LinkedInMessageRow,
  "id" | "created_at"
>;

export type LinkedInScheduledMessageInsert = Omit<
  LinkedInScheduledMessageRow,
  | "id"
  | "created_at"
  | "updated_at"
  | "sent_at"
  | "sent_message_id"
  | "error_message"
  | "retry_count"
>;

// ============================================================================
// Update Types
// ============================================================================

export type LinkedInIntegrationUpdate = Partial<LinkedInIntegrationRow>;
export type LinkedInConversationUpdate = Partial<LinkedInConversationRow>;
export type LinkedInScheduledMessageUpdate =
  Partial<LinkedInScheduledMessageRow>;

// ============================================================================
// Application Interfaces (with computed fields)
// ============================================================================

export interface LinkedInIntegration extends LinkedInIntegrationRow {
  /** Computed: is_active && connection_status === 'connected' */
  isConnected: boolean;
  /** Computed: needs_reconnection (credentials status) */
  needsReconnection: boolean;
}

export interface LinkedInConversation extends LinkedInConversationRow {
  /** Whether this conversation is linked to a recruiting lead */
  hasLinkedLead: boolean;
  /** Human-readable connection degree */
  connectionDegreeLabel: string | null;
}

export interface LinkedInMessage extends LinkedInMessageRow {
  /** Formatted sent timestamp for display */
  formattedSentAt?: string;
  /** Whether message was sent by us */
  isOutbound: boolean;
}

export interface LinkedInScheduledMessage extends LinkedInScheduledMessageRow {
  /** Computed: is scheduled time in the past */
  isPastDue: boolean;
  /** Computed: is validity window expired */
  isExpired: boolean;
}

export interface LinkedInUsageStats {
  messagesSent: number;
  messagesReceived: number;
  inmailsSent: number;
  connectionRequestsSent: number;
  apiCallsMade: number;
  periodStart: string;
  periodEnd: string;
}

// ============================================================================
// Unipile API Types
// ============================================================================

export interface UnipileHostedAuthRequest {
  type: "LINKEDIN" | "LINKEDIN_RECRUITER" | "LINKEDIN_SALES_NAV";
  notify_url: string;
  name: string; // Internal user ID for reference
  success_redirect_url?: string;
  failure_redirect_url?: string;
}

export interface UnipileHostedAuthResponse {
  url: string; // URL to redirect user to
}

export interface UnipileAccountCallback {
  account_id: string;
  type: string;
  status: "CONNECTED" | "CREDENTIALS" | "ERROR";
  name?: string;
}

export interface UnipileAccount {
  id: string;
  type: string;
  name?: string;
  status: "CONNECTED" | "CREDENTIALS" | "ERROR";
  provider_account_id?: string;
  provider_account_name?: string;
  provider_account_picture?: string;
}

export interface UnipileChat {
  id: string;
  account_id: string;
  type: "ONE_TO_ONE" | "GROUP";
  attendees: UnipileChatAttendee[];
  unread_count: number;
  last_message?: UnipileMessage;
  created_at: string;
  updated_at: string;
}

export interface UnipileChatAttendee {
  id: string;
  provider_id: string;
  display_name?: string;
  identifier?: string;
  picture_url?: string;
  is_self: boolean;
}

export interface UnipileMessage {
  id: string;
  chat_id: string;
  account_id: string;
  sender_id: string;
  text?: string;
  attachments?: UnipileAttachment[];
  timestamp: string;
  is_sender_self: boolean;
  is_read?: boolean;
}

export interface UnipileAttachment {
  id: string;
  type: "IMAGE" | "VIDEO" | "DOCUMENT" | "FILE";
  url?: string;
  name?: string;
  size?: number;
  mime_type?: string;
}

export interface UnipileSendMessageRequest {
  text: string;
  attachments?: Array<{
    type: string;
    url: string;
  }>;
}

export interface UnipileWebhookEvent {
  event_type: "NEW_MESSAGE" | "MESSAGE_READ" | "ACCOUNT_STATUS";
  account_id: string;
  data: UnipileMessage | UnipileAccountCallback;
}

// ============================================================================
// Service Types
// ============================================================================

export interface LinkedInConversationFilters {
  isPriority?: boolean;
  hasUnread?: boolean;
  isConnection?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateLeadFromLinkedInInput {
  conversationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
  availability?: "full_time" | "part_time" | "exploring";
  insuranceExperience?:
    | "none"
    | "less_than_1_year"
    | "1_to_3_years"
    | "3_plus_years";
  whyInterested?: string;
}

export interface ScheduleLinkedInMessageInput {
  conversationId: string;
  messageText: string;
  scheduledFor: Date;
  templateId?: string;
  validUntil?: Date;
}

export interface UpdateLinkedInContactInfoInput {
  conversationId: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface SendConnectionRequestInput {
  integrationId: string;
  recipientLinkedInId: string;
  message?: string;
}

// ============================================================================
// Query Key Factory
// ============================================================================

export const linkedinKeys = {
  all: ["linkedin"] as const,

  // Integrations
  integrations: (userId: string) =>
    [...linkedinKeys.all, "integrations", userId] as const,
  integration: (integrationId: string) =>
    [...linkedinKeys.all, "integration", integrationId] as const,

  // Conversations
  conversations: (integrationId: string) =>
    [...linkedinKeys.all, "conversations", integrationId] as const,
  conversation: (conversationId: string) =>
    [...linkedinKeys.all, "conversation", conversationId] as const,
  priorityConversations: (integrationId: string) =>
    [...linkedinKeys.all, "priority", integrationId] as const,

  // Messages
  messages: (conversationId: string) =>
    [...linkedinKeys.all, "messages", conversationId] as const,

  // Scheduled messages
  scheduled: (conversationId: string) =>
    [...linkedinKeys.all, "scheduled", conversationId] as const,
  allScheduled: (integrationId: string) =>
    [...linkedinKeys.all, "allScheduled", integrationId] as const,

  // Usage
  usage: (userId: string, period?: string) =>
    [...linkedinKeys.all, "usage", userId, period] as const,
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get human-readable connection degree label
 */
export function getConnectionDegreeLabel(degree: number | null): string | null {
  if (degree === null) return null;
  switch (degree) {
    case 1:
      return "1st";
    case 2:
      return "2nd";
    case 3:
      return "3rd";
    default:
      return `${degree}th`;
  }
}

/**
 * Transform database row to application interface
 */
export function transformLinkedInIntegration(
  row: LinkedInIntegrationRow,
): LinkedInIntegration {
  return {
    ...row,
    isConnected: row.is_active && row.connection_status === "connected",
    needsReconnection: row.connection_status === "credentials",
  };
}

/**
 * Transform database row to application interface
 */
export function transformLinkedInConversation(
  row: LinkedInConversationRow,
): LinkedInConversation {
  return {
    ...row,
    hasLinkedLead: row.recruiting_lead_id !== null,
    connectionDegreeLabel: getConnectionDegreeLabel(row.connection_degree),
  };
}

/**
 * Transform database row to application interface
 */
export function transformLinkedInMessage(
  row: LinkedInMessageRow,
): LinkedInMessage {
  return {
    ...row,
    isOutbound: row.direction === "outbound",
  };
}

/**
 * Transform database row to application interface
 */
export function transformLinkedInScheduledMessage(
  row: LinkedInScheduledMessageRow,
): LinkedInScheduledMessage {
  const now = new Date();
  const scheduledFor = new Date(row.scheduled_for);
  const validUntil = row.valid_until ? new Date(row.valid_until) : null;

  return {
    ...row,
    isPastDue: scheduledFor < now && row.status === "pending",
    isExpired:
      validUntil !== null && validUntil < now && row.status === "pending",
  };
}

// ============================================================================
// Platform-Agnostic Message Template Types (Shared with Instagram)
// ============================================================================

export type MessageTemplatePlatform = "instagram" | "linkedin" | "all";

export interface MessageTemplateRow {
  id: string;
  imo_id: string;
  user_id: string | null;
  name: string;
  content: string;
  category: string | null;
  message_stage: string | null;
  platform: MessageTemplatePlatform;
  use_count: number;
  last_used_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type MessageTemplateInsert = Omit<
  MessageTemplateRow,
  "id" | "created_at" | "updated_at" | "use_count" | "last_used_at"
>;

export type MessageTemplateUpdate = Partial<MessageTemplateRow>;

/**
 * Get max content length for a platform
 */
export function getMaxContentLengthForPlatform(
  platform: MessageTemplatePlatform,
): number {
  switch (platform) {
    case "instagram":
      return 1000;
    case "linkedin":
    case "all":
      return 8000;
    default:
      return 1000;
  }
}

/**
 * Validate template content length for platform
 */
export function validateTemplateContentLength(
  content: string,
  platform: MessageTemplatePlatform,
): boolean {
  return content.length <= getMaxContentLengthForPlatform(platform);
}
