/**
 * Audit Log Hooks
 * Phase 11: Audit Trail & Activity Logs
 * React Query hooks for audit trail data
 */

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { auditService } from '@/services/audit';
import type { AuditFilters } from '@/services/audit';

/**
 * Query keys for audit logs
 */
export const auditKeys = {
  all: ['audit'] as const,
  logs: (page: number, pageSize: number, filters: AuditFilters) =>
    [...auditKeys.all, 'logs', page, pageSize, JSON.stringify(filters)] as const,
  detail: (id: string) => [...auditKeys.all, 'detail', id] as const,
  actionTypes: () => [...auditKeys.all, 'actionTypes'] as const,
  tables: () => [...auditKeys.all, 'tables'] as const,
  performers: () => [...auditKeys.all, 'performers'] as const,
};

/**
 * Hook for fetching paginated audit logs
 */
export function useAuditLogs(
  page: number,
  pageSize: number,
  filters: AuditFilters,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: auditKeys.logs(page, pageSize, filters),
    queryFn: () => auditService.getAuditLogs(page, pageSize, filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60, // 1 minute
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook for fetching audit log detail
 */
export function useAuditLogDetail(
  auditId: string | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: auditKeys.detail(auditId || ''),
    queryFn: () => auditService.getAuditLogDetail(auditId!),
    enabled: !!auditId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 5, // 5 minutes (detail is less frequently updated)
  });
}

/**
 * Hook for fetching available action types
 */
export function useAuditActionTypes(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: auditKeys.actionTypes(),
    queryFn: () => auditService.getActionTypes(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook for fetching available tables
 */
export function useAuditTables(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: auditKeys.tables(),
    queryFn: () => auditService.getTables(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}

/**
 * Hook for fetching users who have performed actions
 */
export function useAuditPerformers(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: auditKeys.performers(),
    queryFn: () => auditService.getPerformers(),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: options?.enabled ?? true,
  });
}
