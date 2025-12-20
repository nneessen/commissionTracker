// src/services/documents/documentStorageService.ts
import { supabase } from "../base/supabase";

const STORAGE_BUCKET = "user-documents";
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Service for handling document file storage operations
 */
class DocumentStorageService {
  /**
   * Upload a file to storage
   */
  async upload(
    userId: string,
    documentType: string,
    file: File,
  ): Promise<{ storagePath: string }> {
    const fileName = `${Date.now()}_${file.name}`;
    const storagePath = `${userId}/${documentType}/${fileName}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file);

    if (error) {
      throw new Error(`Failed to upload document: ${error.message}`);
    }

    return { storagePath };
  }

  /**
   * Download a file from storage
   */
  async download(storagePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (error) {
      throw new Error(`Failed to download document: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a signed URL for a document
   */
  async getSignedUrl(storagePath: string): Promise<string | null> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (error) {
      console.error("Failed to create signed URL:", error);
      return null;
    }

    return data?.signedUrl || null;
  }

  /**
   * Delete a file from storage
   */
  async delete(storagePath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Failed to delete document: ${error.message}`);
    }
  }

  /**
   * Delete multiple files from storage
   */
  async deleteMany(storagePaths: string[]): Promise<void> {
    if (storagePaths.length === 0) return;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove(storagePaths);

    if (error) {
      throw new Error(`Failed to delete documents: ${error.message}`);
    }
  }

  /**
   * Move a file to a different path
   */
  async move(fromPath: string, toPath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .move(fromPath, toPath);

    if (error) {
      throw new Error(`Failed to move document: ${error.message}`);
    }
  }

  /**
   * Copy a file to a different path
   */
  async copy(fromPath: string, toPath: string): Promise<void> {
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .copy(fromPath, toPath);

    if (error) {
      throw new Error(`Failed to copy document: ${error.message}`);
    }
  }
}

// Export singleton instance
export const documentStorageService = new DocumentStorageService();
export { DocumentStorageService };
