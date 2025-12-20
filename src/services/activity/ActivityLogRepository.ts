// src/services/activity/ActivityLogRepository.ts
import { BaseRepository } from "../base/BaseRepository";
import type {
  ActivityLogEntity,
  ActivityLogRow,
  CreateActivityLogData,
} from "./types";

export class ActivityLogRepository extends BaseRepository<
  ActivityLogEntity,
  CreateActivityLogData,
  never // Activity logs are immutable, no updates
> {
  constructor() {
    super("user_activity_log");
  }

  /**
   * Find activity logs for a user
   */
  async findByUserId(userId: string, limit = 50): Promise<ActivityLogEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw this.handleError(error, "findByUserId");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find activity logs by action type
   */
  async findByActionType(
    actionType: string,
    limit = 100,
  ): Promise<ActivityLogEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("action_type", actionType)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw this.handleError(error, "findByActionType");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find activity logs performed by a specific user
   */
  async findByPerformer(
    performedBy: string,
    limit = 100,
  ): Promise<ActivityLogEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("performed_by", performedBy)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      throw this.handleError(error, "findByPerformer");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Find activity logs within a date range
   */
  async findByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<ActivityLogEntity[]> {
    const { data, error } = await this.client
      .from(this.tableName)
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false });

    if (error) {
      throw this.handleError(error, "findByDateRange");
    }

    return (data || []).map((row) => this.transformFromDB(row));
  }

  /**
   * Log an activity (alias for create)
   */
  async log(data: CreateActivityLogData): Promise<ActivityLogEntity> {
    return this.create(data);
  }

  /**
   * Batch log multiple activities
   */
  async logMany(items: CreateActivityLogData[]): Promise<ActivityLogEntity[]> {
    return this.createMany(items);
  }

  /**
   * Transform database row to entity
   */
  protected transformFromDB(
    dbRecord: Record<string, unknown>,
  ): ActivityLogEntity {
    const row = dbRecord as ActivityLogRow;
    return {
      id: row.id,
      userId: row.user_id,
      actionType: row.action_type,
      details: row.details,
      performedBy: row.performed_by,
      createdAt: row.created_at,
    };
  }

  /**
   * Transform entity to database row for insert
   */
  protected transformToDB(
    data: CreateActivityLogData,
  ): Record<string, unknown> {
    return {
      user_id: data.userId,
      action_type: data.actionType,
      details: data.details ?? null,
      performed_by: data.performedBy ?? null,
    };
  }
}
