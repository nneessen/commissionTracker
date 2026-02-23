// src/services/email/index.ts
// Email Service Exports

// Service and Repository classes
export { emailService, UserEmailService } from "./UserEmailService";
export { UserEmailRepository } from "./UserEmailRepository";

// Types
export type {
  UserEmail,
  UserEmailEntity,
  SendEmailRequest,
  SendEmailResponse,
  CreateUserEmailData,
  UpdateUserEmailData,
  FileAttachment,
  TrainingDocumentAttachment,
} from "./types";

// Re-export template service from features
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

// Re-export unified send function (Gmail-first, Mailgun fallback)
// Use this in shared/layout code instead of importing from the feature path directly.
export { sendEmail } from "@/features/messages/services/emailService";
export type { SendEmailParams } from "@/features/messages/services/emailService";
