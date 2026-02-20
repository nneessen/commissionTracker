// src/features/contracting/components/ContractingDashboard.tsx
// Contracting manager dashboard - shows all recruits with carrier contract requests

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { carrierContractRequestService } from "@/services/recruiting/carrierContractRequestService";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck, Search, CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { ContractingFilters, type ContractingFilterState } from "./ContractingFilters";
import { InlineEditableCell } from "./InlineEditableCell";
import { BulkActionToolbar } from "./BulkActionToolbar";
import { BulkStatusChangeDialog } from "./BulkStatusChangeDialog";
import { ContractRequestDetailDialog } from "./ContractRequestDetailDialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  writing_received: 'bg-green-100 text-green-700',
  completed: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
};

const PAGE_SIZE = 50;

interface ContractRequest {
  id: string;
  recruit_id: string;
  carrier_id: string;
  request_order: number;
  status: string;
  requested_date: string | null;
  writing_received_date: string | null;
  writing_number: string | null;
  carrier: { id: string; name: string } | null;
  recruit: { id: string; first_name: string | null; last_name: string | null; email: string } | null;
}

export function ContractingDashboard() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ContractingFilterState>({
    status: [],
    startDate: null,
    endDate: null,
    carrierId: null,
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusDialogOpen, setBulkStatusDialogOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Get available carriers for filter dropdown
  const { data: availableCarriers } = useQuery({
    queryKey: ['all-carriers-for-contracting'],
    queryFn: async () => {
      const { supabase } = await import('@/services/base/supabase');
      const { data, error } = await supabase
        .from('carriers')
        .select('id, name')
        .order('name');

      if (error) throw error;
      return (data || []) as Array<{ id: string; name: string }>;
    },
  });

  // Get contract requests with filters (uses new service method)
  const { data: contractsData, isLoading } = useQuery({
    queryKey: ['contract-requests-filtered', filters, searchQuery, page],
    queryFn: () => carrierContractRequestService.getContractRequestsWithFilters({
      status: filters.status,
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      carrierId: filters.carrierId || undefined,
      searchQuery,
      page,
      pageSize: PAGE_SIZE,
    }),
  });

  const allRequests = contractsData?.requests || [];
  const totalCount = contractsData?.totalCount || 0;

  // Mutation for inline updates with optimistic updates
  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      carrierContractRequestService.updateContractRequest(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['contract-requests-filtered'] });

      // Snapshot previous value
      const previousData = queryClient.getQueryData(['contract-requests-filtered', filters, searchQuery, page]);

      // Optimistically update
      queryClient.setQueryData(['contract-requests-filtered', filters, searchQuery, page], (old: any) => {
        if (!old?.requests) return old;
        return {
          ...old,
          requests: old.requests.map((r: any) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        };
      });

      return { previousData };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['contract-requests-filtered', filters, searchQuery, page], context.previousData);
      }
      toast.error('Update failed');
    },
    onSuccess: () => {
      toast.success('Updated');
      queryClient.invalidateQueries({ queryKey: ['contract-requests-filtered'] });
    },
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: (status: string) =>
      carrierContractRequestService.bulkUpdateStatus(Array.from(selectedIds), status),
    onSuccess: () => {
      toast.success(`Updated ${selectedIds.size} contracts`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['contract-requests-filtered'] });
    },
    onError: () => {
      toast.error('Bulk update failed');
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: () =>
      carrierContractRequestService.bulkDelete(Array.from(selectedIds)),
    onSuccess: () => {
      toast.success(`Deleted ${selectedIds.size} contracts`);
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['contract-requests-filtered'] });
    },
    onError: () => {
      toast.error('Bulk delete failed');
    },
  });

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRequests.length && paginatedRequests.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRequests.map((r) => r.id)));
    }
  };

  // Row click handler for detail modal
  const handleRowClick = (request: any) => {
    setSelectedRequest(request);
    setDetailModalOpen(true);
  };

  // Bulk action handlers
  const handleBulkExport = async () => {
    try {
      const csv = await carrierContractRequestService.exportToCSV({
        status: filters.status,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        carrierId: filters.carrierId || undefined,
        searchQuery,
      });

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contracts-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Exported contracts to CSV');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} contract requests? This cannot be undone.`)) {
      return;
    }
    await bulkDeleteMutation.mutateAsync();
  };

  // Pagination is handled server-side now
  const paginatedRequests = allRequests;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Reset to page 1 when search query changes
  useMemo(() => {
    setPage(1);
  }, [searchQuery]);

  // Calculate stats from current page (for now - could be enhanced with separate query)
  const stats = useMemo(() => {
    if (!allRequests) return { total: 0, requested: 0, in_progress: 0, writing_received: 0, completed: 0 };

    return {
      total: totalCount,
      requested: allRequests.filter((r) => r.status === 'requested').length,
      in_progress: allRequests.filter((r) => r.status === 'in_progress').length,
      writing_received: allRequests.filter((r) => r.status === 'writing_received').length,
      completed: allRequests.filter((r) => r.status === 'completed').length,
    };
  }, [allRequests, totalCount]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2">
      {/* Compact Header */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-1.5 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4" />
            <h1 className="text-sm font-semibold">Contracting Hub</h1>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="font-medium">{stats.total}</span>
              <span className="text-muted-foreground">total</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-500" />
              <span className="font-medium">{stats.requested}</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3 text-blue-500" />
              <span className="font-medium">{stats.in_progress}</span>
            </div>
            <div className="h-3 w-px bg-border" />
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span className="font-medium">{stats.writing_received}</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <Input
            placeholder="Search recruit or carrier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-7 w-56 pl-7 text-xs"
          />
        </div>
      </div>

      {/* Filters */}
      <ContractingFilters
        filters={filters}
        onFiltersChange={setFilters}
        carriers={availableCarriers || []}
      />

      {/* Table */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="overflow-auto h-full">
          {isLoading ? (
            <div className="p-3 space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/50">
                <TableRow className="h-8">
                  <TableHead className="h-8 w-[40px]">
                    <Checkbox
                      checked={selectedIds.size === paginatedRequests.length && paginatedRequests.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold w-[180px]">Recruit</TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold w-[140px]">Carrier</TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold w-[60px] text-center">Order</TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold w-[90px]">Status</TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold w-[110px]">Writing #</TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold w-[90px]">Requested</TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold w-[90px]">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRequests.map((request) => (
                  <TableRow
                    key={request.id}
                    className="h-9 hover:bg-muted/50 cursor-pointer"
                    onClick={(e) => {
                      // Don't open modal if clicking on checkbox or editable cells
                      const target = e.target as HTMLElement;
                      if (
                        target.closest('button') ||
                        target.closest('[role="checkbox"]') ||
                        target.closest('input') ||
                        target.closest('select') ||
                        target.closest('textarea')
                      ) {
                        return;
                      }
                      handleRowClick(request);
                    }}
                  >
                    <TableCell className="py-1.5">
                      <Checkbox
                        checked={selectedIds.has(request.id)}
                        onCheckedChange={() => toggleSelection(request.id)}
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div>
                        <div className="font-medium text-[11px] truncate">
                          {request.recruit?.first_name} {request.recruit?.last_name}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {request.recruit?.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 text-[11px]">
                      {request.carrier?.name || 'Unknown'}
                    </TableCell>
                    <TableCell className="py-1.5 text-center">
                      <div className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium">
                        {request.request_order}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <InlineEditableCell
                        value={request.status}
                        mode="select"
                        options={[
                          { value: 'requested', label: 'Requested' },
                          { value: 'in_progress', label: 'In Progress' },
                          { value: 'writing_received', label: 'Writing Received' },
                          { value: 'completed', label: 'Completed' },
                          { value: 'rejected', label: 'Rejected' },
                          { value: 'cancelled', label: 'Cancelled' },
                        ]}
                        onSave={async (newStatus) => {
                          await updateMutation.mutateAsync({
                            id: request.id,
                            updates: { status: newStatus },
                          });
                        }}
                        className="inline-block"
                      />
                    </TableCell>
                    <TableCell className="py-1.5">
                      <InlineEditableCell
                        value={request.writing_number}
                        mode="text"
                        placeholder="Enter writing #"
                        onSave={async (newWritingNumber) => {
                          await updateMutation.mutateAsync({
                            id: request.id,
                            updates: {
                              writing_number: newWritingNumber,
                              // Auto-set status to writing_received if writing number is entered
                              ...(newWritingNumber && request.status === 'requested' ? { status: 'writing_received' } : {}),
                            },
                          });
                        }}
                        className="font-mono"
                      />
                    </TableCell>
                    <TableCell className="py-1.5 text-[10px] text-muted-foreground">
                      {request.requested_date ? format(new Date(request.requested_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                    <TableCell className="py-1.5 text-[10px] text-muted-foreground">
                      {request.writing_received_date ? format(new Date(request.writing_received_date), 'MMM d, yyyy') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
                {paginatedRequests.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">
                      {searchQuery ? 'No contracts match your search' : 'No carrier contracts yet'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-1.5 border border-zinc-200 dark:border-zinc-800">
          <div className="text-[10px] text-muted-foreground">
            Showing {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, totalCount)} of {totalCount} contracts
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-6 px-2 text-[10px]"
            >
              <ChevronLeft className="h-3 w-3" />
              Previous
            </Button>
            <span className="text-[10px] px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-6 px-2 text-[10px]"
            >
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      <BulkActionToolbar
        selectedCount={selectedIds.size}
        onStatusChange={() => setBulkStatusDialogOpen(true)}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
        onClear={() => setSelectedIds(new Set())}
      />

      {/* Bulk Status Change Dialog */}
      <BulkStatusChangeDialog
        open={bulkStatusDialogOpen}
        onOpenChange={setBulkStatusDialogOpen}
        selectedCount={selectedIds.size}
        onConfirm={async (newStatus) => {
          await bulkUpdateMutation.mutateAsync(newStatus);
        }}
      />

      {/* Contract Request Detail Modal */}
      {selectedRequest && (
        <ContractRequestDetailDialog
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
          request={selectedRequest}
        />
      )}
    </div>
  );
}

export default ContractingDashboard;
