// src/services/activity/activityLogService.ts
// TODO: can any of these methods be abstracted into a single method, that can handle multiple log actions?
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

  async getById(id: string): Promise<ActivityLogEntity | null> {
    return this.repository.findById(id);
  }

  async getForUser(userId: string, limit = 50): Promise<ActivityLogEntity[]> {
    return this.repository.findByUserId(userId, limit);
  }

  async getByActionType(
    actionType: ActivityActionType | string,
    limit = 100,
  ): Promise<ActivityLogEntity[]> {
    return this.repository.findByActionType(actionType, limit);
  }

  // TODO: another method using 'performer' instead of 'agent'. find and replace all
  async getByPerformer(
    performedBy: string,
    limit = 100,
  ): Promise<ActivityLogEntity[]> {
    return this.repository.findByPerformer(performedBy, limit);
  }

  async getByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<ActivityLogEntity[]> {
    return this.repository.findByDateRange(userId, startDate, endDate);
  }

  async log(data: CreateActivityLogData): Promise<ActivityLogEntity> {
    return this.repository.log(data);
  }

  async logMany(items: CreateActivityLogData[]): Promise<ActivityLogEntity[]> {
    return this.repository.logMany(items);
  }

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

export const activityLogService = new ActivityLogService();
export { ActivityLogService };
