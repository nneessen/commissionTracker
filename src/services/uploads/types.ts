// src/services/uploads/types.ts

export interface FileUploadOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  validateContent?: boolean;
  scanForVirus?: boolean;
  generateThumbnail?: boolean;
  requireAuth?: boolean;
  bucket: string;
  path?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic metadata shape
  metadata?: Record<string, any>;
  onProgress?: (progress: number) => void;
  retryAttempts?: number;
  chunkSize?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  fileInfo: {
    name: string;
    size: number;
    type: string;
    extension: string;
    lastModified: number;
  };
}

export interface UploadResult {
  success: boolean;
  url?: string;
  publicUrl?: string;
  path?: string;
  error?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic metadata shape
  metadata?: Record<string, any>;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  bytesUploaded: number;
  totalBytes: number;
  percentage: number;
  status: "queued" | "uploading" | "completed" | "failed" | "cancelled";
  startTime: Date;
  endTime?: Date;
  error?: string;
  retryCount: number;
}

export interface FileSecurityCheck {
  checkType: "mime" | "extension" | "content" | "size" | "virus";
  passed: boolean;
  message: string;
  severity: "error" | "warning" | "info";
}

export interface UploadQueueItem {
  id: string;
  file: File;
  options: FileUploadOptions;
  priority: number;
  addedAt: Date;
  status: "pending" | "processing" | "completed" | "failed";
  result?: UploadResult;
  progress?: UploadProgress;
}

// File type categories for easy configuration
export const FILE_CATEGORIES = {
  images: {
    mimeTypes: [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ],
    extensions: [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  documents: {
    mimeTypes: [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ],
    extensions: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt", ".csv"],
    maxSize: 25 * 1024 * 1024, // 25MB
  },
  avatars: {
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
    extensions: [".jpg", ".jpeg", ".png", ".webp"],
    maxSize: 5 * 1024 * 1024, // 5MB
  },
  exports: {
    mimeTypes: ["application/pdf", "text/csv", "application/vnd.ms-excel"],
    extensions: [".pdf", ".csv", ".xlsx"],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
} as const;

// Security configuration
export const SECURITY_CONFIG = {
  // Potentially dangerous file types that should be blocked
  blockedExtensions: [
    ".exe",
    ".com",
    ".bat",
    ".cmd",
    ".scr",
    ".pif",
    ".vbs",
    ".js",
    ".jar",
    ".zip",
    ".rar",
    ".7z",
    ".tar",
    ".gz",
    ".sh",
    ".app",
    ".deb",
    ".rpm",
    ".dmg",
    ".pkg",
    ".msi",
    ".dll",
    ".so",
    ".dylib",
    ".html",
    ".htm",
    ".php",
  ],

  // Magic bytes for file type verification
  magicBytes: {
    jpeg: [0xff, 0xd8, 0xff],
    png: [0x89, 0x50, 0x4e, 0x47],
    gif: [0x47, 0x49, 0x46],
    pdf: [0x25, 0x50, 0x44, 0x46],
    zip: [0x50, 0x4b],
  },

  // Maximum file name length
  maxFileNameLength: 255,

  // Regex for safe file names
  safeFileNamePattern: /^[a-zA-Z0-9_\-.\s]+$/,

  // Rate limiting
  rateLimit: {
    maxUploadsPerMinute: 10,
    maxBytesPerMinute: 100 * 1024 * 1024, // 100MB
  },
};

export type FileCategory = keyof typeof FILE_CATEGORIES;
