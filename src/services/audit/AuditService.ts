/**
 * Audit Service
 * Phase 11: Audit Trail & Activity Logs
 * High-level service for audit trail operations
 */

import { AuditRepository } from './AuditRepository';
import type {
  AuditLogListItem,
  AuditLogDetail,
  AuditFilters,
  AuditActionTypeOption,
  AuditTableOption,
  AuditPerformer,
  CreateAuditLogParams,
  PaginatedAuditLogs,
  AuditAction,
} from './audit.types';
import type { Json } from '@/types/database.types';

class AuditServiceClass {
  private repository: AuditRepository;

  constructor() {
    this.repository = new AuditRepository();
  }

  /**
   * Get paginated audit logs with filters
   */
  async getAuditLogs(
    page: number,
    pageSize: number,
    filters: AuditFilters
  ): Promise<PaginatedAuditLogs> {
    return this.repository.getAuditLogs(page, pageSize, filters);
  }

  /**
   * Get full audit log detail
   */
  async getAuditLogDetail(auditId: string): Promise<AuditLogDetail | null> {
    return this.repository.getAuditLogDetail(auditId);
  }

  /**
   * Get available action types for filter
   */
  async getActionTypes(): Promise<AuditActionTypeOption[]> {
    return this.repository.getActionTypes();
  }

  /**
   * Get available tables for filter
   */
  async getTables(): Promise<AuditTableOption[]> {
    return this.repository.getTables();
  }

  /**
   * Get users who have performed actions
   */
  async getPerformers(): Promise<AuditPerformer[]> {
    return this.repository.getPerformers();
  }

  /**
   * Log a custom audit event (application-level)
   */
  async log(params: CreateAuditLogParams): Promise<string> {
    return this.repository.log(params);
  }

  // ============================================
  // CONVENIENCE METHODS FOR COMMON OPERATIONS
  // ============================================

  /**
   * Log a policy-related action
   */
  async logPolicyAction(
    policyId: string,
    action: AuditAction,
    actionType: string,
    description?: string,
    oldData?: Json,
    newData?: Json
  ): Promise<string> {
    return this.log({
      tableName: 'policies',
      recordId: policyId,
      action,
      actionType,
      description,
      oldData,
      newData,
    });
  }

  /**
   * Log a commission-related action
   */
  async logCommissionAction(
    commissionId: string,
    action: AuditAction,
    actionType: string,
    description?: string,
    oldData?: Json,
    newData?: Json
  ): Promise<string> {
    return this.log({
      tableName: 'commissions',
      recordId: commissionId,
      action,
      actionType,
      description,
      oldData,
      newData,
    });
  }

  /**
   * Log a client-related action
   */
  async logClientAction(
    clientId: string,
    action: AuditAction,
    actionType: string,
    description?: string,
    oldData?: Json,
    newData?: Json
  ): Promise<string> {
    return this.log({
      tableName: 'clients',
      recordId: clientId,
      action,
      actionType,
      description,
      oldData,
      newData,
    });
  }

  /**
   * Log a user-related action
   */
  async logUserAction(
    userId: string,
    action: AuditAction,
    actionType: string,
    description?: string,
    oldData?: Json,
    newData?: Json
  ): Promise<string> {
    return this.log({
      tableName: 'user_profiles',
      recordId: userId,
      action,
      actionType,
      description,
      oldData,
      newData,
    });
  }

  // ============================================
  // EXPORT HELPERS
  // ============================================

  /**
   * Transform audit logs for CSV export
   */
  transformForExport(logs: AuditLogListItem[]): Record<string, unknown>[] {
    return logs.map((log) => ({
      Date: new Date(log.createdAt).toLocaleString(),
      Table: log.tableName,
      Action: log.action,
      'Action Type': log.actionType || '',
      'Performed By': log.performedByName || log.performedByEmail || 'System',
      'Changed Fields': log.changedFields?.join(', ') || '',
      'Record ID': log.recordId,
      Source: log.source,
    }));
  }
}

// Singleton instance
export const auditService = new AuditServiceClass();
