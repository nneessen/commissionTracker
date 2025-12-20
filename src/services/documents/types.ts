// src/services/documents/types.ts
import type { Database } from "@/types/database.types";

// Database row types
export type UserDocumentRow =
  Database["public"]["Tables"]["user_documents"]["Row"];
export type UserDocumentInsert =
  Database["public"]["Tables"]["user_documents"]["Insert"];
export type UserDocumentUpdate =
  Database["public"]["Tables"]["user_documents"]["Update"];

// Document status type
export type DocumentStatus =
  | "pending"
  | "received"
  | "approved"
  | "rejected"
  | "expired";

// Entity type for application use
export interface UserDocumentEntity {
  id: string;
  userId: string;
  documentType: string;
  documentName: string;
  fileName: string;
  fileSize: number | null;
  fileType: string | null;
  storagePath: string;
  uploadedBy: string | null;
  uploadedAt: string | null;
  required: boolean;
  status: DocumentStatus;
  notes: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Create document input
export interface CreateDocumentData {
  userId: string;
  documentType: string;
  documentName: string;
  fileName: string;
  fileSize?: number | null;
  fileType?: string | null;
  storagePath: string;
  uploadedBy: string;
  required?: boolean;
  expiresAt?: string | null;
}

// Update document input
export interface UpdateDocumentData {
  documentName?: string;
  documentType?: string;
  status?: DocumentStatus;
  notes?: string | null;
  expiresAt?: string | null;
}

// Upload document request
export interface UploadDocumentRequest {
  userId: string;
  file: File;
  documentType: string;
  documentName: string;
  uploadedBy: string;
  required?: boolean;
  expiresAt?: string;
}

// Document approval input
export interface DocumentApprovalInput {
  documentId: string;
  approverId: string;
  notes?: string;
}

// Document rejection input
export interface DocumentRejectionInput {
  documentId: string;
  approverId: string;
  reason: string;
}
