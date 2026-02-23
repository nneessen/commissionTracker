// src/features/training-hub/services/trainingDocumentService.ts
/**
 * Service for managing training documents (storage + database operations)
 *
 * This service handles the shared document library for trainers and
 * contracting managers. Documents are stored in the 'training-documents'
 * bucket and metadata is stored in the 'training_documents' table.
 */

import { supabase } from "@/services/base/supabase";
import type {
  TrainingDocument,
  TrainingDocumentCategory,
  TrainingDocumentFilters,
  UploadTrainingDocumentParams,
  UpdateTrainingDocumentParams,
  TrainingDocumentRow,
} from "../types/training-document.types";
import { mapRowToTrainingDocument } from "../types/training-document.types";

const STORAGE_BUCKET = "training-documents";
const SIGNED_URL_EXPIRY = 3600; // 1 hour

/**
 * Sanitize a filename for safe storage
 */
function sanitizeFileName(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const extension = lastDot > 0 ? name.slice(lastDot) : "";
  const baseName = lastDot > 0 ? name.slice(0, lastDot) : name;

  const sanitizedBase = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  return `${sanitizedBase}${extension.toLowerCase()}`;
}

/**
 * Build the storage path for a training document
 * Path structure: {category}/{timestamp}_{sanitizedFilename}
 */
function buildStoragePath(
  category: TrainingDocumentCategory,
  fileName: string,
): string {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFileName(fileName);
  return `${category}/${timestamp}_${sanitizedName}`;
}

/**
 * Training Document Service
 */
export const trainingDocumentService = {
  /**
   * List all training documents with optional filters
   */
  async list(filters?: TrainingDocumentFilters): Promise<TrainingDocument[]> {
    let query = supabase
      .from("training_documents")
      .select(
        `
        *,
        uploader:user_profiles!training_documents_uploaded_by_fkey(
          first_name,
          last_name,
          email
        )
      `,
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    // Apply category filter
    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    // Apply uploader filter
    if (filters?.uploadedBy) {
      query = query.eq("uploaded_by", filters.uploadedBy);
    }

    // Apply search filter (name or description)
    if (filters?.search) {
      const searchTerm = `%${filters.search}%`;
      query = query.or(
        `name.ilike.${searchTerm},description.ilike.${searchTerm}`,
      );
    }

    // Apply tags filter
    if (filters?.tags && filters.tags.length > 0) {
      query = query.overlaps("tags", filters.tags);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to list training documents:", error);
      throw new Error(`Failed to list documents: ${error.message}`);
    }

    return (data || []).map((row) => {
      const uploaderData = row.uploader as {
        first_name?: string;
        last_name?: string;
        email?: string;
      } | null;
      const uploaderName = uploaderData
        ? `${uploaderData.first_name || ""} ${uploaderData.last_name || ""}`.trim() ||
          undefined
        : undefined;
      return mapRowToTrainingDocument(
        row as TrainingDocumentRow,
        uploaderName,
        uploaderData?.email || undefined,
      );
    });
  },

  /**
   * Get a single training document by ID
   */
  async getById(id: string): Promise<TrainingDocument | null> {
    const { data, error } = await supabase
      .from("training_documents")
      .select(
        `
        *,
        uploader:user_profiles!training_documents_uploaded_by_fkey(
          first_name,
          last_name,
          email
        )
      `,
      )
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null; // Not found
      }
      throw new Error(`Failed to get document: ${error.message}`);
    }

    const uploaderData = data.uploader as {
      first_name?: string;
      last_name?: string;
      email?: string;
    } | null;
    const uploaderName = uploaderData
      ? `${uploaderData.first_name || ""} ${uploaderData.last_name || ""}`.trim() ||
        undefined
      : undefined;
    return mapRowToTrainingDocument(
      data as TrainingDocumentRow,
      uploaderName,
      uploaderData?.email || undefined,
    );
  },

  /**
   * Upload a new training document (file + database record)
   */
  async upload(
    params: UploadTrainingDocumentParams,
  ): Promise<TrainingDocument> {
    const { file, name, description, category, tags, uploadedBy } = params;

    // Build storage path
    const storagePath = buildStoragePath(category, file.name);

    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, file);

    if (uploadError) {
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Create database record
    const { data, error: dbError } = await supabase
      .from("training_documents")
      .insert({
        name,
        description: description || null,
        category,
        tags: tags || [],
        file_name: file.name,
        file_type: file.type || null,
        file_size: file.size,
        storage_path: storagePath,
        uploaded_by: uploadedBy,
      })
      .select(
        `
        *,
        uploader:user_profiles!training_documents_uploaded_by_fkey(
          first_name,
          last_name,
          email
        )
      `,
      )
      .single();

    if (dbError) {
      // Clean up uploaded file on database error
      const { error: cleanupError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);

      if (cleanupError) {
        // Log orphaned file for manual cleanup - don't throw secondary error
        console.error(
          `ORPHANED FILE: Failed to clean up ${storagePath} after DB error:`,
          cleanupError,
        );
      }

      throw new Error(`Failed to create document record: ${dbError.message}`);
    }

    const uploaderData = data.uploader as {
      first_name?: string;
      last_name?: string;
      email?: string;
    } | null;
    const uploaderName = uploaderData
      ? `${uploaderData.first_name || ""} ${uploaderData.last_name || ""}`.trim() ||
        undefined
      : undefined;
    return mapRowToTrainingDocument(
      data as TrainingDocumentRow,
      uploaderName,
      uploaderData?.email || undefined,
    );
  },

  /**
   * Update training document metadata
   */
  async update(
    id: string,
    params: UpdateTrainingDocumentParams,
  ): Promise<TrainingDocument> {
    const updateData: Record<string, unknown> = {};

    if (params.name !== undefined) updateData.name = params.name;
    if (params.description !== undefined)
      updateData.description = params.description;
    if (params.category !== undefined) updateData.category = params.category;
    if (params.tags !== undefined) updateData.tags = params.tags;

    const { data, error } = await supabase
      .from("training_documents")
      .update(updateData)
      .eq("id", id)
      .select(
        `
        *,
        uploader:user_profiles!training_documents_uploaded_by_fkey(
          first_name,
          last_name,
          email
        )
      `,
      )
      .single();

    if (error) {
      throw new Error(`Failed to update document: ${error.message}`);
    }

    const uploaderData = data.uploader as {
      first_name?: string;
      last_name?: string;
      email?: string;
    } | null;
    const uploaderName = uploaderData
      ? `${uploaderData.first_name || ""} ${uploaderData.last_name || ""}`.trim() ||
        undefined
      : undefined;
    return mapRowToTrainingDocument(
      data as TrainingDocumentRow,
      uploaderName,
      uploaderData?.email || undefined,
    );
  },

  /**
   * Soft delete a training document (sets is_active = false)
   */
  async delete(id: string): Promise<void> {
    // Get the document first to get storage path
    const doc = await this.getById(id);
    if (!doc) {
      throw new Error("Document not found");
    }

    // Soft delete in database
    const { error: dbError } = await supabase
      .from("training_documents")
      .update({ is_active: false })
      .eq("id", id);

    if (dbError) {
      throw new Error(`Failed to delete document: ${dbError.message}`);
    }

    // Also remove from storage
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([doc.storagePath]);

    if (storageError) {
      console.warn(
        `Failed to remove file from storage: ${storageError.message}`,
      );
      // Don't throw - DB record is already marked inactive
    }
  },

  /**
   * Hard delete a training document (permanent removal)
   */
  async hardDelete(id: string): Promise<void> {
    const doc = await this.getById(id);
    if (!doc) {
      throw new Error("Document not found");
    }

    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([doc.storagePath]);

    if (storageError) {
      console.warn(
        `Failed to remove file from storage: ${storageError.message}`,
      );
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from("training_documents")
      .delete()
      .eq("id", id);

    if (dbError) {
      throw new Error(`Failed to delete document: ${dbError.message}`);
    }
  },

  /**
   * Get a signed URL for viewing/downloading a document
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
  },

  /**
   * Download a document as a Blob
   */
  async download(storagePath: string): Promise<Blob> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .download(storagePath);

    if (error) {
      throw new Error(`Failed to download document: ${error.message}`);
    }

    return data;
  },

  /**
   * Get document count (for stats display)
   */
  async getCount(filters?: TrainingDocumentFilters): Promise<number> {
    let query = supabase
      .from("training_documents")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true);

    if (filters?.category) {
      query = query.eq("category", filters.category);
    }

    const { count, error } = await query;

    if (error) {
      console.error("Failed to get document count:", error);
      return 0;
    }

    return count || 0;
  },

  /**
   * Get counts grouped by category
   */
  async getCountsByCategory(): Promise<
    Record<TrainingDocumentCategory, number>
  > {
    const { data, error } = await supabase
      .from("training_documents")
      .select("category")
      .eq("is_active", true);

    if (error) {
      console.error("Failed to get category counts:", error);
      return {
        training: 0,
        underwriting: 0,
        carrier_form: 0,
        compliance: 0,
        marketing: 0,
        other: 0,
      };
    }

    const counts: Record<TrainingDocumentCategory, number> = {
      training: 0,
      underwriting: 0,
      carrier_form: 0,
      compliance: 0,
      marketing: 0,
      other: 0,
    };

    for (const row of data || []) {
      const cat = row.category as TrainingDocumentCategory;
      if (cat in counts) {
        counts[cat]++;
      }
    }

    return counts;
  },
};

export type {
  TrainingDocument,
  TrainingDocumentCategory,
  TrainingDocumentFilters,
};
