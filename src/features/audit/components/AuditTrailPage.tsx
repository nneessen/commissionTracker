/**
 * Audit Trail Page
 * Phase 11: Audit Trail & Activity Logs
 * Main page for viewing org-scoped audit logs
 */

import { useState, useCallback } from 'react';
import { Download, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  useAuditLogs,
  useAuditActionTypes,
  useAuditTables,
  useAuditPerformers,
} from '@/hooks/audit';
import { auditService } from '@/services/audit';
import type { AuditFilters } from '@/services/audit';
import { downloadCSV } from '@/utils/exportHelpers';
import { AuditLogFilters } from './AuditLogFilters';
import { AuditLogTable } from './AuditLogTable';
import { AuditLogDetailDialog } from './AuditLogDetailDialog';

const DEFAULT_PAGE_SIZE = 50;

export function AuditTrailPage() {
  // State
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [selectedAuditId, setSelectedAuditId] = useState<string | null>(null);

  // Queries
  const { data, isLoading, isFetching } = useAuditLogs(page, DEFAULT_PAGE_SIZE, filters);
  const { data: actionTypes } = useAuditActionTypes();
  const { data: tables } = useAuditTables();
  const { data: performers } = useAuditPerformers();

  // Reset page when filters change
  const handleFiltersChange = useCallback((newFilters: AuditFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  // Export to CSV
  const handleExport = useCallback(() => {
    if (!data?.data) return;
    const exportData = auditService.transformForExport(data.data);
    downloadCSV(exportData, 'audit-trail');
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-zinc-600" />
          <h2 className="text-lg font-semibold">Audit Trail</h2>
          {data && (
            <span className="text-xs text-zinc-500">
              ({data.totalCount.toLocaleString()} entries)
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 text-xs"
          onClick={handleExport}
          disabled={!data?.data?.length}
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <AuditLogFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        actionTypes={actionTypes}
        tables={tables}
        performers={performers}
        isLoading={isLoading}
      />

      {/* Table */}
      <AuditLogTable
        data={data?.data || []}
        isLoading={isLoading || isFetching}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
        totalCount={data?.totalCount || 0}
        onPageChange={setPage}
        onSelectLog={setSelectedAuditId}
      />

      {/* Detail Dialog */}
      <AuditLogDetailDialog
        auditId={selectedAuditId}
        onClose={() => setSelectedAuditId(null)}
      />
    </div>
  );
}
