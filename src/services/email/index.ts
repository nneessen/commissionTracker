// src/services/email/index.ts
// Email Service Exports - Unified Resend-based email service

export {
  emailService,
  type EmailOptions,
  type EmailAttachment,
  type EmailResult,
  type BulkEmailResult,
  type EmailUsageStats,
  type QueuedEmail,
  type EmailHistoryFilters,
} from "./emailService";

// Re-export template service from features (will be moved later)
export {
  getEmailTemplates,
  getEmailTemplate,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate,
  duplicateEmailTemplate,
  toggleTemplateActive,
  getUserTemplateStatus,
  getGroupedEmailTemplates,
} from "@/features/email/services/emailTemplateService";
