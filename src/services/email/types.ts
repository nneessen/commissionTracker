// src/services/email/types.ts
// Type definitions for email service layer

import type { UserEmail, UserEmailAttachment } from "@/types/recruiting.types";
import type { EmailStatus } from "@/types/recruiting.types";

// Re-export for convenience
export type { UserEmail, UserEmailAttachment };

// Entity type for email records - matches UserEmail structure
export interface UserEmailEntity {
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

// Training document reference for email attachments (resolved server-side)
export interface TrainingDocumentAttachment {
  id: string;
  name: string;
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
}

// Send email request (matches root emailService interface)
export interface SendEmailRequest {
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  text?: string;
  from: string; // Required - must be from authorized Mailgun domain
  replyTo?: string;
  recruitId?: string;
  senderId?: string;
  metadata?: Record<string, unknown>;
  trainingDocuments?: TrainingDocumentAttachment[];
}

// Send email response
export interface SendEmailResponse {
  success: boolean;
  emailId?: string;
  resendMessageId?: string;
  error?: string;
}

// Base class types for repository pattern
export interface CreateUserEmailData {
  userId: string;
  senderId?: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  status?: string;
  toAddresses?: string[];
  ccAddresses?: string[];
  fromAddress?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateUserEmailData {
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
  status?: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  failedReason?: string;
  isRead?: boolean;
}
