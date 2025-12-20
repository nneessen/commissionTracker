// src/services/recruiting/repositories/PhaseChecklistItemRepository.ts
import { BaseRepository } from "../../base/BaseRepository";
import type { Database, Json } from "@/types/database.types";

// Database row types
type PhaseChecklistItemRow =
  Database["public"]["Tables"]["phase_checklist_items"]["Row"];

// Entity type
export interface PhaseChecklistItemEntity {
  id: string;
  phaseId: string;
  itemName: string;
  itemDescription: string | null;
  itemType: string;
  itemOrder: number;
  isRequired: boolean;
  isActive: boolean;
  documentType: string | null;
  externalLink: string | null;
  canBeCompletedBy: string;
  requiresVerification: boolean;
  verificationBy: string | null;
  metadata: Json | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Create/update types
export interface CreatePhaseChecklistItemData {
  phaseId: string;
  itemName: string;
  itemDescription?: string | null;
  itemType: string;
  itemOrder?: number;
  isRequired?: boolean;
  isActive?: boolean;
  documentType?: string | null;
  externalLink?: string | null;
  canBeCompletedBy: string;
  requiresVerification?: boolean;
  verificationBy?: string | null;
  metadata?: Json | null;
}

export interface UpdatePhaseChecklistItemData {
  itemName?: string;
  itemDescription?: string | null;
  itemType?: string;
  itemOrder?: number;
  isRequired?: boolean;
  isActive?: boolean;
  documentType?: string | null;
  externalLink?: string | null;
  canBeCompletedBy?: string;
  requiresVerification?: boolean;
  verificationBy?: string | null;
  metadata?: Json | null;
}

export class PhaseChecklistItemRepository extends BaseRepository<
  PhaseChecklistItemEntity,
  CreatePhaseChecklistItemData,
  UpdatePhaseChecklistItemData
> {
  constructor() {
    super("phase_checklist_items");
  }

  /**
   * Find checklist items by phase ID
   */
  async findByPhaseId(phaseId: string): Promise<PhaseChecklistItemEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("phase_id", phaseId)
      .order("item_order", { ascending: true });

    if (error) {
      throw this.handleError(error, "findByPhaseId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find active checklist items by phase ID
   */
  async findActiveByPhaseId(
    phaseId: string,
  ): Promise<PhaseChecklistItemEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("phase_id", phaseId)
      .eq("is_active", true)
      .order("item_order", { ascending: true });

    if (error) {
      throw this.handleError(error, "findActiveByPhaseId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find required checklist items by phase ID
   */
  async findRequiredByPhaseId(
    phaseId: string,
  ): Promise<PhaseChecklistItemEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("phase_id", phaseId)
      .eq("is_required", true)
      .eq("is_active", true)
      .order("item_order", { ascending: true });

    if (error) {
      throw this.handleError(error, "findRequiredByPhaseId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Get next item order for a phase
   */
  async getNextItemOrder(phaseId: string): Promise<number> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("item_order")
      .eq("phase_id", phaseId)
      .order("item_order", { ascending: false })
      .limit(1);

    if (error) {
      throw this.handleError(error, "getNextItemOrder");
    }

    return data && data.length > 0 ? data[0].item_order + 1 : 1;
  }

  /**
   * Reorder checklist items
   */
  async reorder(itemIds: string[]): Promise<void> {
    for (let i = 0; i < itemIds.length; i++) {
      const { error } = await this.client
        .from(this.tableName)
        .update({ item_order: i + 1 })
        .eq("id", itemIds[i]);

      if (error) {
        throw this.handleError(error, "reorder");
      }
    }
  }

  /**
   * Transform database row to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): PhaseChecklistItemEntity {
    const row = dbRecord as PhaseChecklistItemRow;
    return {
      id: row.id,
      phaseId: row.phase_id,
      itemName: row.item_name,
      itemDescription: row.item_description,
      itemType: row.item_type,
      itemOrder: row.item_order,
      isRequired: row.is_required ?? false,
      isActive: row.is_active ?? true,
      documentType: row.document_type,
      externalLink: row.external_link,
      canBeCompletedBy: row.can_be_completed_by,
      requiresVerification: row.requires_verification ?? false,
      verificationBy: row.verification_by,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform entity to database row
   */
  protected transformToDB(
    data: CreatePhaseChecklistItemData | UpdatePhaseChecklistItemData,
    isUpdate = false,
  ): Record<string, unknown> {
    if (isUpdate) {
      const updateData = data as UpdatePhaseChecklistItemData;
      const dbData: Record<string, unknown> = {};

      if (updateData.itemName !== undefined)
        dbData.item_name = updateData.itemName;
      if (updateData.itemDescription !== undefined)
        dbData.item_description = updateData.itemDescription;
      if (updateData.itemType !== undefined)
        dbData.item_type = updateData.itemType;
      if (updateData.itemOrder !== undefined)
        dbData.item_order = updateData.itemOrder;
      if (updateData.isRequired !== undefined)
        dbData.is_required = updateData.isRequired;
      if (updateData.isActive !== undefined)
        dbData.is_active = updateData.isActive;
      if (updateData.documentType !== undefined)
        dbData.document_type = updateData.documentType;
      if (updateData.externalLink !== undefined)
        dbData.external_link = updateData.externalLink;
      if (updateData.canBeCompletedBy !== undefined)
        dbData.can_be_completed_by = updateData.canBeCompletedBy;
      if (updateData.requiresVerification !== undefined)
        dbData.requires_verification = updateData.requiresVerification;
      if (updateData.verificationBy !== undefined)
        dbData.verification_by = updateData.verificationBy;
      if (updateData.metadata !== undefined)
        dbData.metadata = updateData.metadata;

      dbData.updated_at = new Date().toISOString();
      return dbData;
    }

    const createData = data as CreatePhaseChecklistItemData;
    return {
      phase_id: createData.phaseId,
      item_name: createData.itemName,
      item_description: createData.itemDescription ?? null,
      item_type: createData.itemType,
      item_order: createData.itemOrder ?? 1,
      is_required: createData.isRequired ?? false,
      is_active: createData.isActive ?? true,
      document_type: createData.documentType ?? null,
      external_link: createData.externalLink ?? null,
      can_be_completed_by: createData.canBeCompletedBy,
      requires_verification: createData.requiresVerification ?? false,
      verification_by: createData.verificationBy ?? null,
      metadata: createData.metadata ?? null,
    };
  }
}
