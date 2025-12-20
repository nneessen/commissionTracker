// src/services/recruiting/repositories/PipelinePhaseRepository.ts
import { BaseRepository } from "../../base/BaseRepository";
import type { Database } from "@/types/database.types";

// Database row types
type PipelinePhaseRow = Database["public"]["Tables"]["pipeline_phases"]["Row"];

// Entity type
export interface PipelinePhaseEntity {
  id: string;
  templateId: string;
  phaseName: string;
  phaseDescription: string | null;
  phaseOrder: number;
  estimatedDays: number | null;
  requiredApproverRole: string | null;
  autoAdvance: boolean;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
}

// Create/update types
export interface CreatePipelinePhaseData {
  templateId: string;
  phaseName: string;
  phaseDescription?: string | null;
  phaseOrder?: number;
  estimatedDays?: number | null;
  requiredApproverRole?: string | null;
  autoAdvance?: boolean;
  isActive?: boolean;
}

export interface UpdatePipelinePhaseData {
  phaseName?: string;
  phaseDescription?: string | null;
  phaseOrder?: number;
  estimatedDays?: number | null;
  requiredApproverRole?: string | null;
  autoAdvance?: boolean;
  isActive?: boolean;
}

export class PipelinePhaseRepository extends BaseRepository<
  PipelinePhaseEntity,
  CreatePipelinePhaseData,
  UpdatePipelinePhaseData
> {
  constructor() {
    super("pipeline_phases");
  }

  /**
   * Find phases by template ID
   */
  async findByTemplateId(templateId: string): Promise<PipelinePhaseEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("template_id", templateId)
      .eq("is_active", true)
      .order("phase_order", { ascending: true });

    if (error) {
      throw this.handleError(error, "findByTemplateId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find all phases by template ID (including inactive)
   */
  async findAllByTemplateId(
    templateId: string,
  ): Promise<PipelinePhaseEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("template_id", templateId)
      .order("phase_order", { ascending: true });

    if (error) {
      throw this.handleError(error, "findAllByTemplateId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find phase with checklist items
   */
  async findWithChecklistItems(phaseId: string): Promise<
    | (PipelinePhaseRow & {
        checklist_items: Database["public"]["Tables"]["phase_checklist_items"]["Row"][];
      })
    | null
  > {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        checklist_items:phase_checklist_items(*)
      `,
      )
      .eq("id", phaseId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "findWithChecklistItems");
    }

    return data;
  }

  /**
   * Get next phase order for a template
   */
  async getNextPhaseOrder(templateId: string): Promise<number> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("phase_order")
      .eq("template_id", templateId)
      .order("phase_order", { ascending: false })
      .limit(1);

    if (error) {
      throw this.handleError(error, "getNextPhaseOrder");
    }

    return data && data.length > 0 ? data[0].phase_order + 1 : 1;
  }

  /**
   * Reorder phases
   */
  async reorder(phaseIds: string[]): Promise<void> {
    for (let i = 0; i < phaseIds.length; i++) {
      const { error } = await this.client
        .from(this.tableName)
        .update({ phase_order: i + 1 })
        .eq("id", phaseIds[i]);

      if (error) {
        throw this.handleError(error, "reorder");
      }
    }
  }

  /**
   * Find next phase after current order
   */
  async findNextPhase(
    templateId: string,
    currentOrder: number,
  ): Promise<PipelinePhaseEntity | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("template_id", templateId)
      .eq("is_active", true)
      .gt("phase_order", currentOrder)
      .order("phase_order", { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "findNextPhase");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Transform database row to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): PipelinePhaseEntity {
    const row = dbRecord as PipelinePhaseRow;
    return {
      id: row.id,
      templateId: row.template_id,
      phaseName: row.phase_name,
      phaseDescription: row.phase_description,
      phaseOrder: row.phase_order,
      estimatedDays: row.estimated_days,
      requiredApproverRole: row.required_approver_role,
      autoAdvance: row.auto_advance ?? false,
      isActive: row.is_active ?? true,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform entity to database row
   */
  protected transformToDB(
    data: CreatePipelinePhaseData | UpdatePipelinePhaseData,
    isUpdate = false,
  ): Record<string, unknown> {
    if (isUpdate) {
      const updateData = data as UpdatePipelinePhaseData;
      const dbData: Record<string, unknown> = {};

      if (updateData.phaseName !== undefined)
        dbData.phase_name = updateData.phaseName;
      if (updateData.phaseDescription !== undefined)
        dbData.phase_description = updateData.phaseDescription;
      if (updateData.phaseOrder !== undefined)
        dbData.phase_order = updateData.phaseOrder;
      if (updateData.estimatedDays !== undefined)
        dbData.estimated_days = updateData.estimatedDays;
      if (updateData.requiredApproverRole !== undefined)
        dbData.required_approver_role = updateData.requiredApproverRole;
      if (updateData.autoAdvance !== undefined)
        dbData.auto_advance = updateData.autoAdvance;
      if (updateData.isActive !== undefined)
        dbData.is_active = updateData.isActive;

      dbData.updated_at = new Date().toISOString();
      return dbData;
    }

    const createData = data as CreatePipelinePhaseData;
    return {
      template_id: createData.templateId,
      phase_name: createData.phaseName,
      phase_description: createData.phaseDescription ?? null,
      phase_order: createData.phaseOrder ?? 1,
      estimated_days: createData.estimatedDays ?? null,
      required_approver_role: createData.requiredApproverRole ?? null,
      auto_advance: createData.autoAdvance ?? false,
      is_active: createData.isActive ?? true,
    };
  }
}
