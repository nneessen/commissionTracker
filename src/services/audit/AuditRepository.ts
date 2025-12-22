/**
 * Audit Repository
 * Phase 11: Audit Trail & Activity Logs
 * Handles database operations for audit logs
 */

import { supabase } from '@/services/base/supabase';
import type {
  AuditLogListItem,
  AuditLogDetail,
  AuditFilters,
  AuditActionTypeOption,
  AuditTableOption,
  AuditPerformer,
  CreateAuditLogParams,
  PaginatedAuditLogs,
} from './audit.types';

export class AuditRepository {
  /**
   * Get paginated audit logs with filters
   */
  async getAuditLogs(
    page: number,
    pageSize: number,
    filters: AuditFilters
  ): Promise<PaginatedAuditLogs> {
    const { data, error } = await supabase.rpc('get_audit_logs', {
      p_page: page,
      p_page_size: pageSize,
      p_table_name: filters.tableName || null,
      p_action: filters.action || null,
      p_action_type: filters.actionType || null,
      p_performed_by: filters.performedBy || null,
      p_record_id: filters.recordId || null,
      p_start_date: filters.startDate?.toISOString() || null,
      p_end_date: filters.endDate?.toISOString() || null,
      p_search: filters.search || null,
    });

    if (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }

    const items = (data || []).map(this.transformListItem);
    const totalCount = items.length > 0 ? items[0].totalCount : 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: items,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Get full audit log detail with old/new data
   */
  async getAuditLogDetail(auditId: string): Promise<AuditLogDetail | null> {
    const { data, error } = await supabase.rpc('get_audit_log_detail', {
      p_audit_id: auditId,
    });

    if (error) {
      throw new Error(`Failed to fetch audit log detail: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return null;
    }

    return this.transformDetail(data[0]);
  }

  /**
   * Get available action types for filter dropdown
   */
  async getActionTypes(): Promise<AuditActionTypeOption[]> {
    const { data, error } = await supabase.rpc('get_audit_action_types');

    if (error) {
      throw new Error(`Failed to fetch action types: ${error.message}`);
    }

    return (data || []).map((row: { action_type: string; count: number }) => ({
      actionType: row.action_type,
      count: Number(row.count),
    }));
  }

  /**
   * Get available tables for filter dropdown
   */
  async getTables(): Promise<AuditTableOption[]> {
    const { data, error } = await supabase.rpc('get_audit_tables');

    if (error) {
      throw new Error(`Failed to fetch tables: ${error.message}`);
    }

    return (data || []).map((row: { table_name: string; count: number }) => ({
      tableName: row.table_name,
      count: Number(row.count),
    }));
  }

  /**
   * Get users who have performed actions (for user filter)
   */
  async getPerformers(): Promise<AuditPerformer[]> {
    const { data, error } = await supabase.rpc('get_audit_performers');

    if (error) {
      throw new Error(`Failed to fetch performers: ${error.message}`);
    }

    return (data || []).map(
      (row: {
        user_id: string;
        user_name: string | null;
        user_email: string | null;
        action_count: number;
      }) => ({
        userId: row.user_id,
        userName: row.user_name,
        userEmail: row.user_email,
        actionCount: Number(row.action_count),
      })
    );
  }

  /**
   * Create an application-level audit log entry
   */
  async log(params: CreateAuditLogParams): Promise<string> {
    const { data, error } = await supabase.rpc('log_audit_event', {
      p_table_name: params.tableName,
      p_record_id: params.recordId,
      p_action: params.action,
      p_action_type: params.actionType,
      p_description: params.description || null,
      p_old_data: params.oldData || null,
      p_new_data: params.newData || null,
      p_changed_fields: params.changedFields || null,
      p_metadata: params.metadata || {},
    });

    if (error) {
      throw new Error(`Failed to log audit event: ${error.message}`);
    }

    return data;
  }

  /**
   * Transform database row to list item
   */
  private transformListItem(row: {
    id: string;
    imo_id: string | null;
    agency_id: string | null;
    table_name: string;
    record_id: string;
    action: string;
    performed_by: string | null;
    performed_by_name: string | null;
    performed_by_email: string | null;
    changed_fields: string[] | null;
    action_type: string | null;
    description: string | null;
    source: string;
    created_at: string;
    total_count: number;
  }): AuditLogListItem {
    return {
      id: row.id,
      imoId: row.imo_id,
      agencyId: row.agency_id,
      tableName: row.table_name,
      recordId: row.record_id,
      action: row.action as AuditLogListItem['action'],
      performedBy: row.performed_by,
      performedByName: row.performed_by_name,
      performedByEmail: row.performed_by_email,
      changedFields: row.changed_fields,
      actionType: row.action_type,
      description: row.description,
      source: row.source as AuditLogListItem['source'],
      createdAt: row.created_at,
      totalCount: Number(row.total_count),
    };
  }

  /**
   * Transform database row to detail
   */
  private transformDetail(row: {
    id: string;
    imo_id: string | null;
    agency_id: string | null;
    table_name: string;
    record_id: string;
    action: string;
    performed_by: string | null;
    performed_by_name: string | null;
    performed_by_email: string | null;
    old_data: unknown;
    new_data: unknown;
    changed_fields: string[] | null;
    action_type: string | null;
    description: string | null;
    source: string;
    metadata: unknown;
    created_at: string;
  }): AuditLogDetail {
    return {
      id: row.id,
      imoId: row.imo_id,
      agencyId: row.agency_id,
      tableName: row.table_name,
      recordId: row.record_id,
      action: row.action as AuditLogDetail['action'],
      performedBy: row.performed_by,
      performedByName: row.performed_by_name,
      performedByEmail: row.performed_by_email,
      oldData: row.old_data as AuditLogDetail['oldData'],
      newData: row.new_data as AuditLogDetail['newData'],
      changedFields: row.changed_fields,
      actionType: row.action_type,
      description: row.description,
      source: row.source as AuditLogDetail['source'],
      metadata: row.metadata as AuditLogDetail['metadata'],
      createdAt: row.created_at,
    };
  }
}
