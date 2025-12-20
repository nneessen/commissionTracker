// src/services/documents/documentService.ts
import { DocumentRepository } from "./DocumentRepository";
import { documentStorageService } from "./documentStorageService";
import type {
  UserDocumentEntity,
  CreateDocumentData,
  UpdateDocumentData,
  DocumentStatus,
  UploadDocumentRequest,
} from "./types";

class DocumentService {
  private repository: DocumentRepository;

  constructor() {
    this.repository = new DocumentRepository();
  }

  // ========================================
  // CRUD Operations
  // ========================================

  /**
   * Get document by ID
   */
  async getById(id: string): Promise<UserDocumentEntity | null> {
    return this.repository.findById(id);
  }

  /**
   * Get all documents for a user
   */
  async getDocumentsForUser(userId: string): Promise<UserDocumentEntity[]> {
    return this.repository.findByUserId(userId);
  }

  /**
   * Get documents by type for a user
   */
  async getDocumentsByType(
    userId: string,
    documentType: string,
  ): Promise<UserDocumentEntity[]> {
    return this.repository.findByUserAndType(userId, documentType);
  }

  /**
   * Get required documents for a user
   */
  async getRequiredDocuments(userId: string): Promise<UserDocumentEntity[]> {
    return this.repository.findRequiredByUserId(userId);
  }

  /**
   * Get documents by status
   */
  async getDocumentsByStatus(
    status: DocumentStatus,
  ): Promise<UserDocumentEntity[]> {
    return this.repository.findByStatus(status);
  }

  /**
   * Get expired documents
   */
  async getExpiredDocuments(): Promise<UserDocumentEntity[]> {
    return this.repository.findExpired();
  }

  // ========================================
  // Upload & Delete Operations
  // ========================================

  /**
   * Upload a document (file + record)
   */
  async uploadDocument(
    request: UploadDocumentRequest,
  ): Promise<UserDocumentEntity> {
    const {
      userId,
      file,
      documentType,
      documentName,
      uploadedBy,
      required,
      expiresAt,
    } = request;

    // Upload file to storage
    const { storagePath } = await documentStorageService.upload(
      userId,
      documentType,
      file,
    );

    // Create document record
    const createData: CreateDocumentData = {
      userId,
      documentType,
      documentName,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      storagePath,
      uploadedBy,
      required: required ?? false,
      expiresAt: expiresAt ?? null,
    };

    try {
      return await this.repository.create(createData);
    } catch (error) {
      // Rollback: delete the uploaded file if record creation fails
      await documentStorageService.delete(storagePath).catch(() => {
        // Ignore cleanup errors
      });
      throw error;
    }
  }

  /**
   * Delete a document (file + record)
   */
  async deleteDocument(id: string): Promise<void> {
    // Get document to retrieve storage path
    const document = await this.repository.findById(id);
    if (!document) {
      throw new Error("Document not found");
    }

    // Delete from storage first
    await documentStorageService.delete(document.storagePath);

    // Delete record
    await this.repository.delete(id);
  }

  // ========================================
  // File Access Operations
  // ========================================

  /**
   * Download a document file
   */
  async downloadDocument(storagePath: string): Promise<Blob> {
    return documentStorageService.download(storagePath);
  }

  /**
   * Get a signed URL for a document
   */
  async getDocumentUrl(storagePath: string): Promise<string | null> {
    return documentStorageService.getSignedUrl(storagePath);
  }

  // ========================================
  // Status & Update Operations
  // ========================================

  /**
   * Update document
   */
  async update(
    id: string,
    data: UpdateDocumentData,
  ): Promise<UserDocumentEntity> {
    return this.repository.update(id, data);
  }

  /**
   * Update document status
   */
  async updateStatus(
    id: string,
    status: DocumentStatus,
    notes?: string,
  ): Promise<UserDocumentEntity> {
    return this.repository.updateStatus(id, status, notes);
  }

  /**
   * Approve a document
   */
  async approve(
    documentId: string,
    _approverId: string,
  ): Promise<UserDocumentEntity> {
    return this.repository.updateStatus(documentId, "approved");
  }

  /**
   * Reject a document
   */
  async reject(
    documentId: string,
    _approverId: string,
    reason: string,
  ): Promise<UserDocumentEntity> {
    return this.repository.updateStatus(documentId, "rejected", reason);
  }

  /**
   * Mark document as expired
   */
  async markExpired(documentId: string): Promise<UserDocumentEntity> {
    return this.repository.updateStatus(documentId, "expired");
  }

  /**
   * Mark document as received
   */
  async markReceived(documentId: string): Promise<UserDocumentEntity> {
    return this.repository.updateStatus(documentId, "received");
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * Check if document exists
   */
  async exists(id: string): Promise<boolean> {
    return this.repository.exists(id);
  }

  /**
   * Count documents for a user
   */
  async countForUser(userId: string): Promise<number> {
    return this.repository.count({ user_id: userId });
  }

  /**
   * Check if all required documents are approved for a user
   */
  async areAllRequiredApproved(userId: string): Promise<boolean> {
    const required = await this.repository.findRequiredByUserId(userId);
    return required.every((doc) => doc.status === "approved");
  }
}

// Export singleton instance
export const documentService = new DocumentService();
export { DocumentService };
