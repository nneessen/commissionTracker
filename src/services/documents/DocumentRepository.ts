// src/services/documents/DocumentRepository.ts
import { BaseRepository } from "../base/BaseRepository";
import type {
  UserDocumentEntity,
  UserDocumentRow,
  CreateDocumentData,
  UpdateDocumentData,
  DocumentStatus,
} from "./types";

export class DocumentRepository extends BaseRepository<
  UserDocumentEntity,
  CreateDocumentData,
  UpdateDocumentData
> {
  constructor() {
    super("user_documents");
  }

  /**
   * Find all documents for a user
   */
  async findByUserId(userId: string): Promise<UserDocumentEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .order("uploaded_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findByUserId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find documents by type for a user
   */
  async findByUserAndType(
    userId: string,
    documentType: string,
  ): Promise<UserDocumentEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("document_type", documentType)
      .order("uploaded_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findByUserAndType");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find documents by status
   */
  async findByStatus(status: DocumentStatus): Promise<UserDocumentEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("status", status)
      .order("uploaded_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findByStatus");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find required documents for a user
   */
  async findRequiredByUserId(userId: string): Promise<UserDocumentEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("required", true)
      .order("uploaded_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findRequiredByUserId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find expired documents
   */
  async findExpired(): Promise<UserDocumentEntity[]> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .lt("expires_at", now)
      .neq("status", "expired")
      .order("expires_at", { ascending: true });

    if (error) {
      throw this.handleError(error, "findExpired");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Update document status
   */
  async updateStatus(
    id: string,
    status: DocumentStatus,
    notes?: string,
  ): Promise<UserDocumentEntity> {
    const { data, error } = await this.client
      .from(this.tableName)
      .update({
        status,
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updateStatus");
    }

    return this.transformFromDB(data);
  }

  /**
   * Transform database row to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): UserDocumentEntity {
    const row = dbRecord as UserDocumentRow;
    return {
      id: row.id,
      userId: row.user_id,
      documentType: row.document_type,
      documentName: row.document_name,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileType: row.file_type,
      storagePath: row.storage_path,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
      required: row.required ?? false,
      status: row.status as DocumentStatus,
      notes: row.notes,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform entity to database row for insert/update
   */
  protected transformToDB(
    data: CreateDocumentData | UpdateDocumentData,
    isUpdate = false,
  ): Record<string, unknown> {
    if (isUpdate) {
      const updateData = data as UpdateDocumentData;
      const dbData: Record<string, unknown> = {};

      if (updateData.documentName !== undefined) {
        dbData.document_name = updateData.documentName;
      }
      if (updateData.documentType !== undefined) {
        dbData.document_type = updateData.documentType;
      }
      if (updateData.status !== undefined) {
        dbData.status = updateData.status;
      }
      if (updateData.notes !== undefined) {
        dbData.notes = updateData.notes;
      }
      if (updateData.expiresAt !== undefined) {
        dbData.expires_at = updateData.expiresAt;
      }

      dbData.updated_at = new Date().toISOString();
      return dbData;
    }

    const createData = data as CreateDocumentData;
    return {
      user_id: createData.userId,
      document_type: createData.documentType,
      document_name: createData.documentName,
      file_name: createData.fileName,
      file_size: createData.fileSize ?? null,
      file_type: createData.fileType ?? null,
      storage_path: createData.storagePath,
      uploaded_by: createData.uploadedBy,
      uploaded_at: new Date().toISOString(),
      required: createData.required ?? false,
      expires_at: createData.expiresAt ?? null,
      status: "pending",
    };
  }
}
