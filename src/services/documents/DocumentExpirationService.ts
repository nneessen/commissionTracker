// src/services/documents/DocumentExpirationService.ts
import { DocumentRepository } from "./DocumentRepository";
import { notificationService } from "../notifications/notification/NotificationService";
import type { UserDocumentEntity } from "./types";
import { DOCUMENT_TYPE_LABELS } from "../../types/documents.types";
import type { InsuranceDocumentType } from "../../types/documents.types";
import { logger } from "../base/logger";

/**
 * Expiration alert thresholds in days
 */
export const EXPIRATION_THRESHOLDS = {
  CRITICAL: 30, // Red - Urgent
  WARNING: 60, // Yellow - Soon
  UPCOMING: 90, // Blue - Heads up
} as const;

/**
 * Result of expiring documents grouped by urgency
 */
export interface ExpiringDocumentsSummary {
  critical: UserDocumentEntity[]; // 0-30 days
  warning: UserDocumentEntity[]; // 31-60 days
  upcoming: UserDocumentEntity[]; // 61-90 days
  counts: {
    critical: number;
    warning: number;
    upcoming: number;
    total: number;
  };
}

/**
 * Service for managing document expiration tracking and alerts
 */
class DocumentExpirationService {
  private repository: DocumentRepository;

  constructor() {
    this.repository = new DocumentRepository();
  }

  /**
   * Get documents expiring within specified day ranges for a user
   * Categorized by urgency level
   */
  async getExpiringDocuments(
    userId: string,
  ): Promise<ExpiringDocumentsSummary> {
    // Get documents expiring within each threshold
    const [criticalDocs, warningDocs, upcomingDocs] = await Promise.all([
      this.repository.findExpiringForUser(
        userId,
        EXPIRATION_THRESHOLDS.CRITICAL,
      ),
      this.repository.findExpiringForUser(
        userId,
        EXPIRATION_THRESHOLDS.WARNING,
      ),
      this.repository.findExpiringForUser(
        userId,
        EXPIRATION_THRESHOLDS.UPCOMING,
      ),
    ]);

    // Filter to get exclusive ranges
    const criticalIds = new Set(criticalDocs.map((d) => d.id));
    const warningOnly = warningDocs.filter((d) => !criticalIds.has(d.id));
    const warningIds = new Set(warningDocs.map((d) => d.id));
    const upcomingOnly = upcomingDocs.filter((d) => !warningIds.has(d.id));

    return {
      critical: criticalDocs,
      warning: warningOnly,
      upcoming: upcomingOnly,
      counts: {
        critical: criticalDocs.length,
        warning: warningOnly.length,
        upcoming: upcomingOnly.length,
        total: criticalDocs.length + warningOnly.length + upcomingOnly.length,
      },
    };
  }

  /**
   * Get expiration counts for a user (for dashboard badges)
   */
  async getExpirationCounts(
    userId: string,
  ): Promise<{ critical: number; warning: number; upcoming: number }> {
    return this.repository.countExpiringByRanges(userId);
  }

  /**
   * Calculate days until expiration for a document
   */
  getDaysUntilExpiration(expiresAt: string | null): number | null {
    if (!expiresAt) return null;

    const expiration = new Date(expiresAt);
    const now = new Date();
    const diffMs = expiration.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Get urgency level for a document based on days until expiration
   */
  getUrgencyLevel(
    daysUntilExpiration: number | null,
  ): "critical" | "warning" | "upcoming" | "none" {
    if (daysUntilExpiration === null) return "none";
    if (daysUntilExpiration <= 0) return "critical"; // Already expired
    if (daysUntilExpiration <= EXPIRATION_THRESHOLDS.CRITICAL)
      return "critical";
    if (daysUntilExpiration <= EXPIRATION_THRESHOLDS.WARNING) return "warning";
    if (daysUntilExpiration <= EXPIRATION_THRESHOLDS.UPCOMING)
      return "upcoming";
    return "none";
  }

  /**
   * Create expiration notifications for documents expiring soon
   * Should be called by a scheduled job or on user login
   *
   * @param userId - Optional user ID to limit notifications to a specific user
   */
  async createExpirationNotifications(userId?: string): Promise<number> {
    let notificationsCreated = 0;

    try {
      // Get documents expiring within 90 days
      const expiringDocs = userId
        ? await this.repository.findExpiringForUser(
            userId,
            EXPIRATION_THRESHOLDS.UPCOMING,
          )
        : await this.repository.findExpiring(EXPIRATION_THRESHOLDS.UPCOMING);

      for (const doc of expiringDocs) {
        const daysUntil = this.getDaysUntilExpiration(doc.expiresAt);
        if (daysUntil === null) continue;

        // Only create notifications at specific thresholds (30, 60, 90 days)
        const thresholds = [30, 60, 90];
        const shouldNotify = thresholds.some(
          (threshold) => daysUntil === threshold || daysUntil === threshold - 1,
        );

        if (!shouldNotify) continue;

        const urgency = this.getUrgencyLevel(daysUntil);
        const docTypeLabel =
          DOCUMENT_TYPE_LABELS[doc.documentType as InsuranceDocumentType] ||
          doc.documentType;

        const title =
          daysUntil <= 30
            ? `Urgent: ${docTypeLabel} expires in ${daysUntil} days`
            : `${docTypeLabel} expires in ${daysUntil} days`;

        const message =
          daysUntil <= 7
            ? `Your ${docTypeLabel} will expire on ${new Date(doc.expiresAt!).toLocaleDateString()}. Please renew immediately.`
            : `Your ${docTypeLabel} "${doc.documentName}" will expire on ${new Date(doc.expiresAt!).toLocaleDateString()}. Please renew soon.`;

        try {
          await notificationService.createNotification({
            user_id: doc.userId,
            type: "document_expiring",
            title,
            message,
            metadata: {
              document_id: doc.id,
              document_type: doc.documentType,
              document_name: doc.documentName,
              expires_at: doc.expiresAt,
              days_until_expiry: daysUntil,
              urgency,
              link: `/documents/${doc.id}`,
            },
          });
          notificationsCreated++;
        } catch (err) {
          // Skip if notification already exists or other error
          logger.error("Failed to create expiration notification", {
            documentId: doc.id,
            error: err,
          });
        }
      }
    } catch (err) {
      logger.error("Error creating expiration notifications", { error: err });
      throw err;
    }

    return notificationsCreated;
  }

  /**
   * Mark expired documents as 'expired' status
   * Returns count of documents marked
   */
  async markExpiredDocuments(): Promise<number> {
    try {
      const count = await this.repository.markExpired();
      if (count > 0) {
        logger.info(`Marked ${count} documents as expired`);
      }
      return count;
    } catch (err) {
      logger.error("Error marking expired documents", { error: err });
      throw err;
    }
  }

  /**
   * Run all expiration maintenance tasks
   * - Mark expired documents
   * - Create notifications for expiring documents
   */
  async runExpirationMaintenance(userId?: string): Promise<{
    markedExpired: number;
    notificationsCreated: number;
  }> {
    const markedExpired = await this.markExpiredDocuments();
    const notificationsCreated =
      await this.createExpirationNotifications(userId);

    return { markedExpired, notificationsCreated };
  }
}

// Export singleton instance
export const documentExpirationService = new DocumentExpirationService();
export { DocumentExpirationService };
