// src/services/activity/activityLogService.ts
import { ActivityLogRepository } from "./ActivityLogRepository";
import type {
  ActivityLogEntity,
  CreateActivityLogData,
  ActivityActionType,
} from "./types";
import type { Json } from "@/types/database.types";

class ActivityLogService {
  private repository: ActivityLogRepository;

  constructor() {
    this.repository = new ActivityLogRepository();
  }

  // ========================================
  // Query Operations
  // ========================================

  /**
   * Get activity log by ID
   */
  async getById(id: string): Promise<ActivityLogEntity | null> {
    return this.repository.findById(id);
  }

  /**
   * Get activity logs for a user
   */
  async getForUser(userId: string, limit = 50): Promise<ActivityLogEntity[]> {
    return this.repository.findByUserId(userId, limit);
  }

  /**
   * Get activity logs by action type
   */
  async getByActionType(
    actionType: ActivityActionType | string,
    limit = 100,
  ): Promise<ActivityLogEntity[]> {
    return this.repository.findByActionType(actionType, limit);
  }

  /**
   * Get activity logs performed by a specific user
   */
  async getByPerformer(
    performedBy: string,
    limit = 100,
  ): Promise<ActivityLogEntity[]> {
    return this.repository.findByPerformer(performedBy, limit);
  }

  /**
   * Get activity logs within a date range
   */
  async getByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<ActivityLogEntity[]> {
    return this.repository.findByDateRange(userId, startDate, endDate);
  }

  // ========================================
  // Logging Operations
  // ========================================

  /**
   * Log a generic activity
   */
  async log(data: CreateActivityLogData): Promise<ActivityLogEntity> {
    return this.repository.log(data);
  }

  /**
   * Log multiple activities
   */
  async logMany(items: CreateActivityLogData[]): Promise<ActivityLogEntity[]> {
    return this.repository.logMany(items);
  }

  // ========================================
  // Convenience Logging Methods
  // ========================================

  /**
   * Log recruit created
   */
  async logRecruitCreated(
    userId: string,
    performedBy: string,
    details?: Json,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "recruit_created",
      performedBy,
      details,
    });
  }

  /**
   * Log recruit updated
   */
  async logRecruitUpdated(
    userId: string,
    performedBy: string,
    details?: Json,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "recruit_updated",
      performedBy,
      details,
    });
  }

  /**
   * Log phase advanced
   */
  async logPhaseAdvanced(
    userId: string,
    performedBy: string,
    fromPhase: string,
    toPhase: string,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "phase_advanced",
      performedBy,
      details: { fromPhase, toPhase } as unknown as Json,
    });
  }

  /**
   * Log phase blocked
   */
  async logPhaseBlocked(
    userId: string,
    performedBy: string,
    phase: string,
    reason: string,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "phase_blocked",
      performedBy,
      details: { phase, reason } as unknown as Json,
    });
  }

  /**
   * Log document uploaded
   */
  async logDocumentUploaded(
    userId: string,
    performedBy: string,
    documentName: string,
    documentType: string,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "document_uploaded",
      performedBy,
      details: { documentName, documentType } as unknown as Json,
    });
  }

  /**
   * Log document approved
   */
  async logDocumentApproved(
    userId: string,
    performedBy: string,
    documentName: string,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "document_approved",
      performedBy,
      details: { documentName } as unknown as Json,
    });
  }

  /**
   * Log document rejected
   */
  async logDocumentRejected(
    userId: string,
    performedBy: string,
    documentName: string,
    reason: string,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "document_rejected",
      performedBy,
      details: { documentName, reason } as unknown as Json,
    });
  }

  /**
   * Log email sent
   */
  async logEmailSent(
    userId: string,
    performedBy: string,
    subject: string,
    to: string[],
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "email_sent",
      performedBy,
      details: { subject, to } as unknown as Json,
    });
  }

  /**
   * Log checklist item completed
   */
  async logChecklistItemCompleted(
    userId: string,
    performedBy: string,
    itemName: string,
    phaseName: string,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "checklist_item_completed",
      performedBy,
      details: { itemName, phaseName } as unknown as Json,
    });
  }

  /**
   * Log status changed
   */
  async logStatusChanged(
    userId: string,
    performedBy: string,
    fromStatus: string,
    toStatus: string,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "status_changed",
      performedBy,
      details: { fromStatus, toStatus } as unknown as Json,
    });
  }

  /**
   * Log note added
   */
  async logNoteAdded(
    userId: string,
    performedBy: string,
    notePreview?: string,
  ): Promise<ActivityLogEntity> {
    return this.log({
      userId,
      actionType: "note_added",
      performedBy,
      details: notePreview ? ({ notePreview } as unknown as Json) : null,
    });
  }
}

// Export singleton instance
export const activityLogService = new ActivityLogService();
export { ActivityLogService };
