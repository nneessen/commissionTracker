// Email System Types

export type EmailProvider = 'gmail' | 'outlook'

export type EmailStatus =
  | 'draft'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'failed'

export type EmailQueueStatus =
  | 'pending'
  | 'processing'
  | 'sent'
  | 'failed'
  | 'cancelled'

export type EmailTriggerType =
  | 'phase_started'
  | 'phase_completed'
  | 'phase_blocked'
  | 'checklist_completed'
  | 'checklist_approved'
  | 'checklist_rejected'
  | 'recruit_graduated'
  | 'custom'

export type EmailTemplateCategory =
  | 'onboarding'
  | 'documents'
  | 'follow_up'
  | 'general'

// OAuth token record (from database, but with encrypted fields)
export interface EmailOAuthToken {
  id: string
  user_id: string
  provider: EmailProvider
  email_address: string
  is_active: boolean
  token_expiry: string | null
  scopes: string[]
  last_used_at: string | null
  created_at: string
  updated_at: string
}

// Email connection status for UI
export interface EmailConnectionStatus {
  isConnected: boolean
  provider: EmailProvider | null
  email: string | null
  lastUsed: string | null
  expiresAt: string | null
}

// Email template
export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  body_text: string | null
  variables: string[]
  category: EmailTemplateCategory
  is_global: boolean
  created_by: string | null
  is_active: boolean
  usage_count: number
  created_at: string
  updated_at: string
}

// Create template request
export interface CreateEmailTemplateRequest {
  name: string
  subject: string
  body_html: string
  body_text?: string
  variables?: string[]
  category?: EmailTemplateCategory
  is_global?: boolean
}

// Email trigger rule
export interface EmailTrigger {
  id: string
  name: string
  description: string | null
  trigger_type: EmailTriggerType
  trigger_config: EmailTriggerConfig
  template_id: string
  delay_minutes: number
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  // Joined fields
  template?: EmailTemplate
}

// Trigger configuration varies by type
export type EmailTriggerConfig =
  | PhaseChangeTriggerConfig
  | ChecklistTriggerConfig
  | CustomTriggerConfig

export interface PhaseChangeTriggerConfig {
  phase_id?: string // Optional: trigger for specific phase
  to_status: 'in_progress' | 'completed' | 'blocked'
}

export interface ChecklistTriggerConfig {
  checklist_item_id?: string // Optional: trigger for specific item
  to_status: 'completed' | 'approved' | 'rejected'
}

export interface CustomTriggerConfig {
  [key: string]: unknown
}

// Email queue item
export interface EmailQueueItem {
  id: string
  trigger_id: string | null
  recipient_user_id: string
  sender_user_id: string
  template_id: string | null
  subject: string | null
  body_html: string | null
  variables: Record<string, string> | null
  scheduled_for: string
  status: EmailQueueStatus
  attempts: number
  max_attempts: number
  error_message: string | null
  sent_at: string | null
  email_id: string | null
  created_at: string
  updated_at: string
  // Joined fields
  recipient?: { first_name: string; last_name: string; email: string }
  sender?: { first_name: string; last_name: string; email: string }
  template?: EmailTemplate
}

// Extended user_emails type (with Gmail/Outlook fields)
export interface UserEmail {
  id: string
  user_id: string
  sender_id: string | null
  subject: string
  body_html: string | null
  body_text: string | null
  status: EmailStatus
  sent_at: string | null
  delivered_at: string | null
  opened_at: string | null
  failed_reason: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
  // Gmail/Outlook integration fields
  provider: EmailProvider | null
  provider_message_id: string | null
  thread_id: string | null
  is_incoming: boolean
  reply_to_id: string | null
  from_address: string | null
  to_addresses: string[] | null
  cc_addresses: string[] | null
  labels: string[] | null
  // Joined fields
  sender?: { first_name: string; last_name: string; email: string }
  attachments?: UserEmailAttachment[]
}

export interface UserEmailAttachment {
  id: string
  email_id: string
  file_name: string
  file_size: number
  mime_type: string
  storage_path: string
  created_at: string
}

// Send email request (to Edge Function)
export interface SendEmailRequest {
  to: string[]
  cc?: string[]
  subject: string
  bodyHtml: string
  bodyText?: string
  attachments?: Array<{
    filename: string
    content: string // Base64 encoded
    mimeType: string
  }>
  threadId?: string
  replyToEmailId?: string
  recruitId?: string
}

// Send email response
export interface SendEmailResponse {
  success: boolean
  emailId?: string
  gmailMessageId?: string
  threadId?: string
  error?: string
}

// Email quota tracking
export interface EmailQuota {
  user_id: string
  provider: EmailProvider
  date: string
  emails_sent: number
  daily_limit: number // Frontend-provided, based on provider
  remaining: number
}

// Template variable definitions
export const EMAIL_TEMPLATE_VARIABLES = [
  { name: 'recruit_name', description: 'Full name of the recruit' },
  { name: 'recruit_first_name', description: 'First name of the recruit' },
  { name: 'recruit_email', description: 'Email address of the recruit' },
  { name: 'phase_name', description: 'Current phase name' },
  { name: 'phase_description', description: 'Phase description' },
  { name: 'sender_name', description: 'Name of the email sender' },
  { name: 'recruiter_name', description: 'Name of the recruiter' },
  { name: 'checklist_items', description: 'List of pending checklist items' },
  { name: 'current_date', description: 'Current date (formatted)' },
  { name: 'deadline_date', description: 'Phase deadline date (if set)' },
] as const

export type EmailTemplateVariableName = typeof EMAIL_TEMPLATE_VARIABLES[number]['name']
