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
   * Find expired documents (expires_at < now and not already marked expired)
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
   * Find documents expiring within N days
   * Returns documents where: now < expires_at <= (now + daysAhead days)
   */
  async findExpiring(daysAhead: number): Promise<UserDocumentEntity[]> {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .gt("expires_at", now.toISOString())
      .lte("expires_at", futureDate.toISOString())
      .neq("status", "expired")
      .order("expires_at", { ascending: true });

    if (error) {
      throw this.handleError(error, "findExpiring");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find documents expiring within N days for a specific user
   */
  async findExpiringForUser(
    userId: string,
    daysAhead: number,
  ): Promise<UserDocumentEntity[]> {
    const now = new Date();
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .gt("expires_at", now.toISOString())
      .lte("expires_at", futureDate.toISOString())
      .neq("status", "expired")
      .order("expires_at", { ascending: true });

    if (error) {
      throw this.handleError(error, "findExpiringForUser");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Mark all expired documents as 'expired' status
   * Returns the count of documents updated
   */
  async markExpired(): Promise<number> {
    const now = new Date().toISOString();
    const { data, error } = await this.client
      .from(this.tableName)
      .update({
        status: "expired",
        updated_at: now,
      })
      .lt("expires_at", now)
      .neq("status", "expired")
      .select("id");

    if (error) {
      throw this.handleError(error, "markExpired");
    }

    return data?.length ?? 0;
  }

  /**
   * Count documents expiring within specified day ranges for a user
   * Useful for dashboard badges
   */
  async countExpiringByRanges(userId: string): Promise<{
    critical: number; // 0-30 days
    warning: number; // 31-60 days
    upcoming: number; // 61-90 days
  }> {
    const now = new Date();
    const thirtyDays = new Date(now);
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const sixtyDays = new Date(now);
    sixtyDays.setDate(sixtyDays.getDate() + 60);
    const ninetyDays = new Date(now);
    ninetyDays.setDate(ninetyDays.getDate() + 90);

    // Get all expiring within 90 days
    const { data, error } = await this.client
      .from(this.tableName)
      .select("expires_at")
      .eq("user_id", userId)
      .gt("expires_at", now.toISOString())
      .lte("expires_at", ninetyDays.toISOString())
      .neq("status", "expired");

    if (error) {
      throw this.handleError(error, "countExpiringByRanges");
    }

    // Categorize by ranges
    let critical = 0;
    let warning = 0;
    let upcoming = 0;

    for (const row of data || []) {
      const expiresAt = new Date(row.expires_at as string);
      if (expiresAt <= thirtyDays) {
        critical++;
      } else if (expiresAt <= sixtyDays) {
        warning++;
      } else {
        upcoming++;
      }
    }

    return { critical, warning, upcoming };
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
