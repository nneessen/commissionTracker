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

  // TODO: poor name for this method. should be findByAgent instead, not performer. fix and grep to find all occurences and replace with new method name
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

  // TODO: confirm the dates used in this method are correct format
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

  async log(data: CreateActivityLogData): Promise<ActivityLogEntity> {
    return this.create(data);
  }

  async logMany(items: CreateActivityLogData[]): Promise<ActivityLogEntity[]> {
    return this.createMany(items);
  }

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
