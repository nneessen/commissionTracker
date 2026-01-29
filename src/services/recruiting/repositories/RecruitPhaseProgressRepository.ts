// src/services/recruiting/repositories/RecruitPhaseProgressRepository.ts
import { BaseRepository } from "../../base/BaseRepository";
import type { Database } from "@/types/database.types";

// Database row types
type RecruitPhaseProgressRow =
  Database["public"]["Tables"]["recruit_phase_progress"]["Row"];

// Status type
export type PhaseProgressStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked"
  | "skipped";

// Entity type
export interface RecruitPhaseProgressEntity {
  id: string;
  userId: string;
  phaseId: string;
  templateId: string;
  status: PhaseProgressStatus;
  startedAt: string | null;
  completedAt: string | null;
  blockedReason: string | null;
  notes: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

// Create/update types
export interface CreateRecruitPhaseProgressData {
  userId: string;
  phaseId: string;
  templateId: string;
  status?: PhaseProgressStatus;
  startedAt?: string | null;
  imoId?: string | null;
  agencyId?: string | null;
}

export interface UpdateRecruitPhaseProgressData {
  status?: PhaseProgressStatus;
  startedAt?: string | null;
  completedAt?: string | null;
  blockedReason?: string | null;
  notes?: string | null;
}

export class RecruitPhaseProgressRepository extends BaseRepository<
  RecruitPhaseProgressEntity,
  CreateRecruitPhaseProgressData,
  UpdateRecruitPhaseProgressData
> {
  constructor() {
    super("recruit_phase_progress");
  }

  /**
   * Find all progress records for a user
   */
  async findByUserId(userId: string): Promise<RecruitPhaseProgressEntity[]> {
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
   * Find progress records with phase details for a user
   */
  async findByUserIdWithPhase(userId: string): Promise<
    (RecruitPhaseProgressRow & {
      phase: Database["public"]["Tables"]["pipeline_phases"]["Row"];
    })[]
  > {
    const { data, error } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        phase:phase_id(*)
      `,
      )
      .eq("user_id", userId);

    if (error) {
      throw this.handleError(error, "findByUserIdWithPhase");
    }

    return data || [];
  }

  /**
   * Find current in-progress phase for a user
   */
  async findCurrentPhase(
    userId: string,
  ): Promise<RecruitPhaseProgressEntity | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (error) {
      throw this.handleError(error, "findCurrentPhase");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Find current in-progress or blocked phase for a user (with phase details)
   */
  async findCurrentPhaseWithDetails(userId: string): Promise<
    | (RecruitPhaseProgressRow & {
        phase: Database["public"]["Tables"]["pipeline_phases"]["Row"] & {
          checklist_items: Database["public"]["Tables"]["phase_checklist_items"]["Row"][];
        };
      })
    | null
  > {
    // First try in_progress
    const { data: inProgressData, error: inProgressError } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        phase:phase_id(
          *,
          checklist_items:phase_checklist_items(*)
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (inProgressError) {
      throw this.handleError(inProgressError, "findCurrentPhaseWithDetails");
    }

    // If found in_progress, return it
    if (inProgressData) {
      return inProgressData;
    }

    // If no in_progress, try blocked
    const { data: blockedData, error: blockedError } = await this.client
      .from(this.tableName)
      .select(
        `
        *,
        phase:phase_id(
          *,
          checklist_items:phase_checklist_items(*)
        )
      `,
      )
      .eq("user_id", userId)
      .eq("status", "blocked")
      .maybeSingle();

    if (blockedError) {
      throw this.handleError(blockedError, "findCurrentPhaseWithDetails");
    }

    return blockedData;
  }

  /**
   * Find progress for a specific user and phase
   */
  async findByUserAndPhase(
    userId: string,
    phaseId: string,
  ): Promise<RecruitPhaseProgressEntity | null> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("phase_id", phaseId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      throw this.handleError(error, "findByUserAndPhase");
    }

    return data ? this.transformFromDB(data) : null;
  }

  /**
   * Update status for a user's phase
   */
  async updateStatus(
    userId: string,
    phaseId: string,
    status: PhaseProgressStatus,
    options?: { notes?: string; blockedReason?: string },
  ): Promise<RecruitPhaseProgressEntity> {
    const updates: Record<string, unknown> = {
      status,
      notes: options?.notes || null,
      blocked_reason: options?.blockedReason || null,
      updated_at: new Date().toISOString(),
    };

    if (status === "in_progress") {
      updates.started_at = new Date().toISOString();
    }
    if (status === "completed") {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await this.client
      .from(this.tableName)
      .update(updates)
      .eq("user_id", userId)
      .eq("phase_id", phaseId)
      .select()
      .single();

    if (error) {
      throw this.handleError(error, "updateStatus");
    }

    return this.transformFromDB(data);
  }

  /**
   * Create multiple progress records (for initializing a user's pipeline)
   */
  async createMany(
    items: CreateRecruitPhaseProgressData[],
  ): Promise<RecruitPhaseProgressEntity[]> {
    const dbData = items.map((item) => this.transformToDB(item));

    const { data, error } = await this.client
      .from(this.tableName)
      .insert(dbData)
      .select();

    if (error) {
      throw this.handleError(error, "createMany");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Create or update progress records (upsert) - handles race conditions safely
   */
  async upsertMany(
    items: CreateRecruitPhaseProgressData[],
  ): Promise<RecruitPhaseProgressEntity[]> {
    const dbData = items.map((item) => this.transformToDB(item));

    const { data, error } = await this.client
      .from(this.tableName)
      .upsert(dbData, {
        onConflict: "user_id,phase_id",
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
  ): RecruitPhaseProgressEntity {
    const row = dbRecord as RecruitPhaseProgressRow;
    return {
      id: row.id,
      userId: row.user_id,
      phaseId: row.phase_id,
      templateId: row.template_id,
      status: row.status as PhaseProgressStatus,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      blockedReason: row.blocked_reason,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Transform entity to database row
   */
  protected transformToDB(
    data: CreateRecruitPhaseProgressData | UpdateRecruitPhaseProgressData,
    isUpdate = false,
  ): Record<string, unknown> {
    if (isUpdate) {
      const updateData = data as UpdateRecruitPhaseProgressData;
      const dbData: Record<string, unknown> = {};

      if (updateData.status !== undefined) dbData.status = updateData.status;
      if (updateData.startedAt !== undefined)
        dbData.started_at = updateData.startedAt;
      if (updateData.completedAt !== undefined)
        dbData.completed_at = updateData.completedAt;
      if (updateData.blockedReason !== undefined)
        dbData.blocked_reason = updateData.blockedReason;
      if (updateData.notes !== undefined) dbData.notes = updateData.notes;

      dbData.updated_at = new Date().toISOString();
      return dbData;
    }

    const createData = data as CreateRecruitPhaseProgressData;
    return {
      user_id: createData.userId,
      phase_id: createData.phaseId,
      template_id: createData.templateId,
      status: createData.status ?? "not_started",
      started_at: createData.startedAt ?? null,
      imo_id: createData.imoId ?? null,
      agency_id: createData.agencyId ?? null,
    };
  }
}
