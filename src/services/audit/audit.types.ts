/**
 * Audit Trail Types
 * Phase 11: Audit Trail & Activity Logs
 */

import type { Json } from '@/types/database.types';

// Database enum types
export type AuditAction = 'INSERT' | 'UPDATE' | 'DELETE';
export type AuditSource = 'trigger' | 'application';

/**
 * Audit log entry (list view - without full data)
 */
export interface AuditLogListItem {
  id: string;
  imoId: string | null;
  agencyId: string | null;
  tableName: string;
  recordId: string;
  action: AuditAction;
  performedBy: string | null;
  performedByName: string | null;
  performedByEmail: string | null;
  changedFields: string[] | null;
  actionType: string | null;
  description: string | null;
  source: AuditSource;
  createdAt: string;
  totalCount: number;
}

/**
 * Audit log entry (full detail with old/new data)
 */
export interface AuditLogDetail {
  id: string;
  imoId: string | null;
  agencyId: string | null;
  tableName: string;
  recordId: string;
  action: AuditAction;
  performedBy: string | null;
  performedByName: string | null;
  performedByEmail: string | null;
  oldData: Json | null;
  newData: Json | null;
  changedFields: string[] | null;
  actionType: string | null;
  description: string | null;
  source: AuditSource;
  metadata: Json | null;
  createdAt: string;
}

/**
 * Filter parameters for audit log queries
 */
export interface AuditFilters {
  tableName?: string;
  action?: AuditAction;
  actionType?: string;
  performedBy?: string;
  recordId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
}

/**
 * Action type for filter dropdown
 */
export interface AuditActionTypeOption {
  actionType: string;
  count: number;
}

/**
 * Table name for filter dropdown
 */
export interface AuditTableOption {
  tableName: string;
  count: number;
}

/**
 * User who performed actions (for filter)
 */
export interface AuditPerformer {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  actionCount: number;
}

/**
 * Parameters for creating an application-level audit log
 */
export interface CreateAuditLogParams {
  tableName: string;
  recordId: string;
  action: AuditAction;
  actionType: string;
  description?: string;
  oldData?: Json;
  newData?: Json;
  changedFields?: string[];
  metadata?: Json;
}

/**
 * Paginated audit logs response
 */
export interface PaginatedAuditLogs {
  data: AuditLogListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Cleanup result
 */
export interface AuditCleanupResult {
  deletedNonFinancial: number;
  deletedFinancial: number;
  totalDeleted: number;
}

/**
 * Human-readable action type labels
 */
export const ACTION_TYPE_LABELS: Record<string, string> = {
  policies_created: 'Policy Created',
  policies_updated: 'Policy Updated',
  policies_deleted: 'Policy Deleted',
  commissions_created: 'Commission Created',
  commissions_updated: 'Commission Updated',
  commissions_deleted: 'Commission Deleted',
  clients_created: 'Client Created',
  clients_updated: 'Client Updated',
  clients_deleted: 'Client Deleted',
  user_profiles_created: 'User Created',
  user_profiles_updated: 'User Updated',
  user_profiles_deleted: 'User Deleted',
  override_commissions_created: 'Override Created',
  override_commissions_updated: 'Override Updated',
  override_commissions_deleted: 'Override Deleted',
};

/**
 * Human-readable table name labels
 */
export const TABLE_NAME_LABELS: Record<string, string> = {
  policies: 'Policies',
  commissions: 'Commissions',
  clients: 'Clients',
  user_profiles: 'Users',
  override_commissions: 'Override Commissions',
};

/**
 * Action colors for UI
 */
export const ACTION_COLORS: Record<AuditAction, string> = {
  INSERT: 'text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400',
  UPDATE: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  DELETE: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
};
