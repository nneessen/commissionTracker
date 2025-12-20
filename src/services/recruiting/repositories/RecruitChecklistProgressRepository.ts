// src/services/recruiting/repositories/RecruitChecklistProgressRepository.ts
import { BaseRepository } from "../../base/BaseRepository";
import type { Database, Json } from "@/types/database.types";

// Database row types
type RecruitChecklistProgressRow =
  Database["public"]["Tables"]["recruit_checklist_progress"]["Row"];

// Status type
export type ChecklistProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "approved"
  | "rejected"
  | "needs_resubmission";

// Entity type
export interface RecruitChecklistProgressEntity {
  id: string;
  userId: string;
  checklistItemId: string;
  status: ChecklistProgressStatus;
  completedAt: string | null;
  completedBy: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  documentId: string | null;
  notes: string | null;
  rejectionReason: string | null;
  metadata: Json | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Create/update types
export interface CreateRecruitChecklistProgressData {
  userId: string;
  checklistItemId: string;
  status?: ChecklistProgressStatus;
}

export interface UpdateRecruitChecklistProgressData {
  status?: ChecklistProgressStatus;
  completedAt?: string | null;
  completedBy?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  documentId?: string | null;
  notes?: string | null;
  rejectionReason?: string | null;
  metadata?: Json | null;
}

export class RecruitChecklistProgressRepository extends BaseRepository<
  RecruitChecklistProgressEntity,
  CreateRecruitChecklistProgressData,
  UpdateRecruitChecklistProgressData
> {
  constructor() {
    super("recruit_checklist_progress");
  }

  /**
   * Find progress for checklist items by user
   */
  async findByUserId(
    userId: string,
  ): Promise<RecruitChecklistProgressEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId);

    if (error) {
      throw this.handleError(error, "findByUserId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find progress for a user's checklist items with item details
   */
  async findByUserIdWithItems(userId: string): Promise<
    (RecruitChecklistProgressRow & {
      checklist_item: Database["public"]["Tables"]["phase_checklist_items"]["Row"];
    })[]
  > {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        checklist_item:checklist_item_id(*)
      `,
      )
      .eq("user_id", userId);

    if (error) {
      throw this.handleError(error, "findByUserIdWithItems");
    }

    return data || [];
  }

  /**
   * Find progress for a specific phase's checklist items
   */
  async findByUserAndPhase(
    userId: string,
    phaseId: string,
  ): Promise<
    (RecruitChecklistProgressRow & {
      checklist_item: Database["public"]["Tables"]["phase_checklist_items"]["Row"];
    })[]
  > {
    // First get checklist items for the phase
    const { data: items, error: itemsError } = await this.client
      .from("phase_checklist_items")
      .select("id")
      .eq("phase_id", phaseId);

    if (itemsError) {
      throw this.handleError(itemsError, "findByUserAndPhase");
    }

    if (!items || items.length === 0) {
      return [];
    }

    const itemIds = items.map((item) => item.id);

    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        checklist_item:checklist_item_id(*)
      `,
      )
      .eq("user_id", userId)
      .in("checklist_item_id", itemIds);

    if (error) {
      throw this.handleError(error, "findByUserAndPhase");
    }

    return data || [];
  }

  /**
   * Find progress for a specific user and checklist item
   */
  async findByUserAndItem(
    userId: string,
    checklistItemId: string,
  ): Promise<RecruitChecklistProgressEntity | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("checklist_item_id", checklistItemId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "findByUserAndItem");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find progress by document ID
   */
  async findByDocumentId(
    documentId: string,
  ): Promise<RecruitChecklistProgressEntity | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("document_id", documentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "findByDocumentId");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Update status for a user's checklist item
   */
  async updateStatus(
    userId: string,
    checklistItemId: string,
    status: ChecklistProgressStatus,
    options?: {
      completedBy?: string;
      verifiedBy?: string;
      documentId?: string;
      notes?: string;
      rejectionReason?: string;
      metadata?: Json;
    },
  ): Promise<RecruitChecklistProgressEntity> {
    const updates: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (options?.notes !== undefined) updates.notes = options.notes;
    if (options?.metadata !== undefined) updates.metadata = options.metadata;
    if (options?.documentId !== undefined)
      updates.document_id = options.documentId;

    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
      if (options?.completedBy) updates.completed_by = options.completedBy;
    }

    if (status === "approved") {
      updates.verified_at = new Date().toISOString();
      if (options?.verifiedBy) updates.verified_by = options.verifiedBy;
    }

    if (status === "rejected" || status === "needs_resubmission") {
      updates.verified_at = new Date().toISOString();
      if (options?.verifiedBy) updates.verified_by = options.verifiedBy;
      if (options?.rejectionReason)
        updates.rejection_reason = options.rejectionReason;
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq("user_id", userId)
      .eq("checklist_item_id", checklistItemId)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updateStatus");
    }

    return this.transformFromDB(data);
  }

  /**
   * Create or update progress records (upsert)
   */
  async upsertMany(
    items: CreateRecruitChecklistProgressData[],
  ): Promise<RecruitChecklistProgressEntity[]> {
    const dbData = items.map((item) => this.transformToDB(item));

    const { data, error } = await this.client
      .from(this.tableName)
      .upsert(dbData, {
        onConflict: "user_id,checklist_item_id",
        ignoreDuplicates: true,
      })
      .select();

    if (error) {
      throw this.handleError(error, "upsertMany");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Transform database row to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): RecruitChecklistProgressEntity {
    const row = dbRecord as RecruitChecklistProgressRow;
    return {
      id: row.id,
      userId: row.user_id,
      checklistItemId: row.checklist_item_id,
      status: row.status as ChecklistProgressStatus,
      completedAt: row.completed_at,
      completedBy: row.completed_by,
      verifiedAt: row.verified_at,
      verifiedBy: row.verified_by,
      documentId: row.document_id,
      notes: row.notes,
      rejectionReason: row.rejection_reason,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform entity to database row
   */
  protected transformToDB(
    data:
      | CreateRecruitChecklistProgressData
      | UpdateRecruitChecklistProgressData,
    isUpdate = false,
  ): Record<string, unknown> {
    if (isUpdate) {
      const updateData = data as UpdateRecruitChecklistProgressData;
      const dbData: Record<string, unknown> = {};

      if (updateData.status !== undefined) dbData.status = updateData.status;
      if (updateData.completedAt !== undefined)
        dbData.completed_at = updateData.completedAt;
      if (updateData.completedBy !== undefined)
        dbData.completed_by = updateData.completedBy;
      if (updateData.verifiedAt !== undefined)
        dbData.verified_at = updateData.verifiedAt;
      if (updateData.verifiedBy !== undefined)
        dbData.verified_by = updateData.verifiedBy;
      if (updateData.documentId !== undefined)
        dbData.document_id = updateData.documentId;
      if (updateData.notes !== undefined) dbData.notes = updateData.notes;
      if (updateData.rejectionReason !== undefined)
        dbData.rejection_reason = updateData.rejectionReason;
      if (updateData.metadata !== undefined)
        dbData.metadata = updateData.metadata;

      dbData.updated_at = new Date().toISOString();
      return dbData;
    }

    const createData = data as CreateRecruitChecklistProgressData;
    return {
      user_id: createData.userId,
      checklist_item_id: createData.checklistItemId,
      status: createData.status ?? "not_started",
    };
  }
}
