// src/services/uploads/FileValidationService.ts

import {
  FileValidationResult,
  FileSecurityCheck,
  FileUploadOptions,
  SECURITY_CONFIG,
  FILE_CATEGORIES,
  FileCategory
} from './types';

export class FileValidationService {
  private static instance: FileValidationService;

  private constructor() {}

  static getInstance(): FileValidationService {
    if (!this.instance) {
      this.instance = new FileValidationService();
    }
    return this.instance;
  }

  /**
   * Comprehensive file validation
   */
  async validate(file: File, options: FileUploadOptions): Promise<FileValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const securityChecks: FileSecurityCheck[] = [];

    // Extract file info
    const fileInfo = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      extension: this.getFileExtension(file.name),
      lastModified: file.lastModified,
    };

    // 1. Check file name safety
    const nameCheck = this.checkFileName(file.name);
    securityChecks.push(nameCheck);
    if (!nameCheck.passed) {
      errors.push(nameCheck.message);
    }

    // 2. Check file size
    const sizeCheck = this.checkFileSize(file.size, options.maxSizeBytes);
    securityChecks.push(sizeCheck);
    if (!sizeCheck.passed) {
      errors.push(sizeCheck.message);
    }

    // 3. Check file extension
    const extensionCheck = this.checkFileExtension(fileInfo.extension, options.allowedExtensions);
    securityChecks.push(extensionCheck);
    if (!extensionCheck.passed) {
      errors.push(extensionCheck.message);
    }

    // 4. Check MIME type
    const mimeCheck = this.checkMimeType(file.type, options.allowedMimeTypes);
    securityChecks.push(mimeCheck);
    if (!mimeCheck.passed) {
      errors.push(mimeCheck.message);
    }

    // 5. Check for blocked extensions
    const blockedCheck = this.checkForBlockedExtensions(fileInfo.extension);
    securityChecks.push(blockedCheck);
    if (!blockedCheck.passed) {
      errors.push(blockedCheck.message);
    }

    // 6. Validate file content (magic bytes)
    if (options.validateContent) {
      const contentCheck = await this.validateFileContent(file);
      securityChecks.push(contentCheck);
      if (!contentCheck.passed) {
        errors.push(contentCheck.message);
      }
    }

    // 7. Check for potential malicious content
    const maliciousCheck = await this.checkForMaliciousContent(file);
    if (!maliciousCheck.passed) {
      errors.push(maliciousCheck.message);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      fileInfo,
    };
  }

  /**
   * Get file category based on extension or MIME type
   */
  getFileCategory(file: File): FileCategory | null {
    const extension = this.getFileExtension(file.name).toLowerCase();
    const mimeType = file.type.toLowerCase();

    for (const [category, config] of Object.entries(FILE_CATEGORIES)) {
      const extensions = config.extensions as readonly string[];
      const mimeTypes = config.mimeTypes as readonly string[];
      if (extensions.some(ext => ext === extension) || mimeTypes.some(mt => mt === mimeType)) {
        return category as FileCategory;
      }
    }
    return null;
  }

  /**
   * Sanitize filename for safe storage
   */
  sanitizeFileName(fileName: string): string {
    // Remove path traversal attempts
    let safe = fileName.replace(/\.\./g, '').replace(/[\/\\]/g, '_');

    // Remove control characters and special characters
    safe = safe.replace(/[^\w\s\-\.]/gi, '_');

    // Limit length
    if (safe.length > SECURITY_CONFIG.maxFileNameLength) {
      const ext = this.getFileExtension(safe);
      const nameWithoutExt = safe.substring(0, safe.lastIndexOf('.'));
      safe = nameWithoutExt.substring(0, SECURITY_CONFIG.maxFileNameLength - ext.length - 10) +
             '_' + Date.now() + ext;
    }

    // Ensure it's not empty
    if (!safe || safe === '.') {
      safe = 'file_' + Date.now();
    }

    return safe;
  }

  /**
   * Generate unique filename with timestamp
   */
  generateUniqueFileName(originalName: string, userId?: string): string {
    const sanitized = this.sanitizeFileName(originalName);
    const extension = this.getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);

    if (userId) {
      return `${userId}_${nameWithoutExt}_${timestamp}_${random}${extension}`;
    }
    return `${nameWithoutExt}_${timestamp}_${random}${extension}`;
  }

  private checkFileName(fileName: string): FileSecurityCheck {
    if (!fileName || fileName.length === 0) {
      return {
        checkType: 'extension',
        passed: false,
        message: 'File name is required',
        severity: 'error',
      };
    }

    if (fileName.length > SECURITY_CONFIG.maxFileNameLength) {
      return {
        checkType: 'extension',
        passed: false,
        message: `File name is too long (max ${SECURITY_CONFIG.maxFileNameLength} characters)`,
        severity: 'error',
      };
    }

    // Check for path traversal attempts
    if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
      return {
        checkType: 'extension',
        passed: false,
        message: 'File name contains invalid path characters',
        severity: 'error',
      };
    }

    return {
      checkType: 'extension',
      passed: true,
      message: 'File name is valid',
      severity: 'info',
    };
  }

  private checkFileSize(size: number, maxSize?: number): FileSecurityCheck {
    if (size === 0) {
      return {
        checkType: 'size',
        passed: false,
        message: 'File is empty',
        severity: 'error',
      };
    }

    const limit = maxSize || 50 * 1024 * 1024; // Default 50MB
    if (size > limit) {
      const limitMB = Math.round(limit / (1024 * 1024));
      const sizeMB = Math.round(size / (1024 * 1024));
      return {
        checkType: 'size',
        passed: false,
        message: `File size (${sizeMB}MB) exceeds maximum allowed size (${limitMB}MB)`,
        severity: 'error',
      };
    }

    return {
      checkType: 'size',
      passed: true,
      message: 'File size is acceptable',
      severity: 'info',
    };
  }

  private checkFileExtension(extension: string, allowedExtensions?: string[]): FileSecurityCheck {
    if (!extension) {
      return {
        checkType: 'extension',
        passed: false,
        message: 'File has no extension',
        severity: 'error',
      };
    }

    if (allowedExtensions && allowedExtensions.length > 0) {
      const ext = extension.toLowerCase();
      const allowed = allowedExtensions.map(e => e.toLowerCase());
      if (!allowed.includes(ext)) {
        return {
          checkType: 'extension',
          passed: false,
          message: `File type ${ext} is not allowed. Allowed types: ${allowed.join(', ')}`,
          severity: 'error',
        };
      }
    }

    return {
      checkType: 'extension',
      passed: true,
      message: 'File extension is valid',
      severity: 'info',
    };
  }

  private checkMimeType(mimeType: string, allowedMimeTypes?: string[]): FileSecurityCheck {
    if (!mimeType || mimeType === '') {
      return {
        checkType: 'mime',
        passed: false,
        message: 'File has no MIME type',
        severity: 'warning',
      };
    }

    if (allowedMimeTypes && allowedMimeTypes.length > 0) {
      if (!allowedMimeTypes.includes(mimeType)) {
        return {
          checkType: 'mime',
          passed: false,
          message: `MIME type ${mimeType} is not allowed`,
          severity: 'error',
        };
      }
    }

    return {
      checkType: 'mime',
      passed: true,
      message: 'MIME type is valid',
      severity: 'info',
    };
  }

  private checkForBlockedExtensions(extension: string): FileSecurityCheck {
    const ext = extension.toLowerCase();
    if (SECURITY_CONFIG.blockedExtensions.includes(ext)) {
      return {
        checkType: 'extension',
        passed: false,
        message: `File type ${ext} is blocked for security reasons`,
        severity: 'error',
      };
    }

    return {
      checkType: 'extension',
      passed: true,
      message: 'File type is not blocked',
      severity: 'info',
    };
  }

  private async validateFileContent(file: File): Promise<FileSecurityCheck> {
    try {
      const buffer = await this.readFileAsArrayBuffer(file, 512); // Read first 512 bytes
      const bytes = new Uint8Array(buffer);

      // Check magic bytes for common file types
      const fileType = this.detectFileTypeByMagicBytes(bytes);
      const expectedType = this.getExpectedTypeFromExtension(file.name);

      if (expectedType && fileType && fileType !== expectedType) {
        return {
          checkType: 'content',
          passed: false,
          message: `File content (${fileType}) doesn't match extension (${expectedType})`,
          severity: 'error',
        };
      }

      return {
        checkType: 'content',
        passed: true,
        message: 'File content validation passed',
        severity: 'info',
      };
    } catch (error) {
      return {
        checkType: 'content',
        passed: false,
        message: 'Failed to validate file content',
        severity: 'warning',
      };
    }
  }

  private async checkForMaliciousContent(file: File): Promise<FileSecurityCheck> {
    // Check for suspicious patterns in file name
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+=/i,  // onclick=, onload=, etc.
      /data:text\/html/i,
      /%3Cscript/i,  // URL encoded <script
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.name)) {
        return {
          checkType: 'content',
          passed: false,
          message: 'File name contains potentially malicious patterns',
          severity: 'error',
        };
      }
    }

    // For text-based files, check content
    if (file.type.startsWith('text/') || file.type === 'application/javascript') {
      try {
        const content = await this.readFileAsText(file, 1024); // Read first 1KB
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(content)) {
            return {
              checkType: 'content',
              passed: false,
              message: 'File content contains potentially malicious patterns',
              severity: 'error',
            };
          }
        }
      } catch (error) {
        // If we can't read it, be cautious
        return {
          checkType: 'content',
          passed: false,
          message: 'Unable to scan file content',
          severity: 'warning',
        };
      }
    }

    return {
      checkType: 'virus',
      passed: true,
      message: 'No malicious content detected',
      severity: 'info',
    };
  }

  private getFileExtension(fileName: string): string {
    const lastDot = fileName.lastIndexOf('.');
    if (lastDot === -1) return '';
    return fileName.substring(lastDot).toLowerCase();
  }

  private async readFileAsArrayBuffer(file: File, bytes?: number): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;

      if (bytes && bytes < file.size) {
        reader.readAsArrayBuffer(file.slice(0, bytes));
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  private async readFileAsText(file: File, bytes?: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;

      if (bytes && bytes < file.size) {
        reader.readAsText(file.slice(0, bytes));
      } else {
        reader.readAsText(file);
      }
    });
  }

  private detectFileTypeByMagicBytes(bytes: Uint8Array): string | null {
    // Check for common file type signatures
    if (this.matchBytes(bytes, SECURITY_CONFIG.magicBytes.jpeg)) return 'jpeg';
    if (this.matchBytes(bytes, SECURITY_CONFIG.magicBytes.png)) return 'png';
    if (this.matchBytes(bytes, SECURITY_CONFIG.magicBytes.gif)) return 'gif';
    if (this.matchBytes(bytes, SECURITY_CONFIG.magicBytes.pdf)) return 'pdf';
    if (this.matchBytes(bytes, SECURITY_CONFIG.magicBytes.zip)) return 'zip';
    return null;
  }

  private matchBytes(source: Uint8Array, pattern: number[]): boolean {
    if (source.length < pattern.length) return false;
    for (let i = 0; i < pattern.length; i++) {
      if (source[i] !== pattern[i]) return false;
    }
    return true;
  }

  private getExpectedTypeFromExtension(fileName: string): string | null {
    const ext = this.getFileExtension(fileName);
    const typeMap: Record<string, string> = {
      '.jpg': 'jpeg',
      '.jpeg': 'jpeg',
      '.png': 'png',
      '.gif': 'gif',
      '.pdf': 'pdf',
      '.zip': 'zip',
    };
    return typeMap[ext] || null;
  }
}