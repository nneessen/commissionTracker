// src/features/training-hub/types/training-document.types.ts
/**
 * Training Document Type Definitions
 *
 * Defines categories, types, and interfaces for the shared document library
 * used by trainers and contracting managers.
 */

import type { Database } from "@/types/database.types";

// =============================================================================
// Database Row Type
// =============================================================================

export type TrainingDocumentRow =
  Database["public"]["Tables"]["training_documents"]["Row"];
export type TrainingDocumentInsert =
  Database["public"]["Tables"]["training_documents"]["Insert"];
export type TrainingDocumentUpdate =
  Database["public"]["Tables"]["training_documents"]["Update"];

// =============================================================================
// Document Categories
// =============================================================================

/**
 * Training document category values (matches database CHECK constraint)
 */
export const TRAINING_DOCUMENT_CATEGORIES = [
  "training",
  "underwriting",
  "carrier_form",
  "compliance",
  "marketing",
  "other",
] as const;

export type TrainingDocumentCategory =
  (typeof TRAINING_DOCUMENT_CATEGORIES)[number];

/**
 * Category metadata for UI display
 */
export const TRAINING_CATEGORY_CONFIG: Record<
  TrainingDocumentCategory,
  {
    label: string;
    description: string;
    icon: string;
  }
> = {
  training: {
    label: "Training",
    description: "Training materials, guides, and educational content",
    icon: "GraduationCap",
  },
  underwriting: {
    label: "Underwriting Guides",
    description: "Carrier underwriting guidelines and requirements",
    icon: "FileSearch",
  },
  carrier_form: {
    label: "Carrier Forms",
    description: "Application forms and carrier documents",
    icon: "FileText",
  },
  compliance: {
    label: "Compliance",
    description: "Compliance documents and regulatory materials",
    icon: "Shield",
  },
  marketing: {
    label: "Marketing",
    description: "Marketing materials and sales resources",
    icon: "Megaphone",
  },
  other: {
    label: "Other",
    description: "Miscellaneous documents",
    icon: "File",
  },
};

/**
 * Category display order for UI
 */
export const TRAINING_CATEGORY_ORDER: TrainingDocumentCategory[] = [
  "training",
  "underwriting",
  "carrier_form",
  "compliance",
  "marketing",
  "other",
];

// =============================================================================
// Domain Types
// =============================================================================

/**
 * Training document with uploader info (joined from user_profiles)
 */
export interface TrainingDocument {
  id: string;
  name: string;
  description: string | null;
  category: TrainingDocumentCategory;
  tags: string[];
  fileName: string;
  fileType: string | null;
  fileSize: number | null;
  storagePath: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

/**
 * Parameters for uploading a new training document
 */
export interface UploadTrainingDocumentParams {
  file: File;
  name: string;
  description?: string;
  category: TrainingDocumentCategory;
  tags?: string[];
  uploadedBy: string;
}

/**
 * Parameters for updating training document metadata
 */
export interface UpdateTrainingDocumentParams {
  name?: string;
  description?: string;
  category?: TrainingDocumentCategory;
  tags?: string[];
}

/**
 * Filter options for listing training documents
 */
export interface TrainingDocumentFilters {
  category?: TrainingDocumentCategory;
  search?: string;
  uploadedBy?: string;
  tags?: string[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get human-readable label for a category
 */
export function getCategoryLabel(category: TrainingDocumentCategory): string {
  return TRAINING_CATEGORY_CONFIG[category]?.label || category;
}

/**
 * Check if a string is a valid training document category
 */
export function isValidTrainingCategory(
  value: string,
): value is TrainingDocumentCategory {
  return TRAINING_DOCUMENT_CATEGORIES.includes(
    value as TrainingDocumentCategory,
  );
}

/**
 * Transform database row to domain model
 */
export function mapRowToTrainingDocument(
  row: TrainingDocumentRow,
  uploaderName?: string,
  uploaderEmail?: string,
): TrainingDocument {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category as TrainingDocumentCategory,
    tags: row.tags || [],
    fileName: row.file_name,
    fileType: row.file_type,
    fileSize: row.file_size,
    storagePath: row.storage_path,
    uploadedBy: row.uploaded_by,
    uploadedByName: uploaderName,
    uploadedByEmail: uploaderEmail,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    isActive: row.is_active ?? true,
  };
}

// =============================================================================
// File Utilities
// =============================================================================

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return "0 B";

  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * Get file extension from filename
 */
export function getFileExtension(fileName: string): string {
  const parts = fileName.split(".");
  return parts.length > 1 ? parts.pop()?.toLowerCase() || "" : "";
}

/**
 * Get icon name based on file type
 */
export function getFileTypeIcon(fileType: string | null): string {
  if (!fileType) return "File";

  if (fileType.includes("pdf")) return "FileText";
  if (fileType.includes("word") || fileType.includes("document"))
    return "FileText";
  if (fileType.includes("excel") || fileType.includes("spreadsheet"))
    return "Table";
  if (fileType.includes("powerpoint") || fileType.includes("presentation"))
    return "Presentation";
  if (fileType.includes("image")) return "Image";
  if (fileType.includes("text")) return "FileText";

  return "File";
}
