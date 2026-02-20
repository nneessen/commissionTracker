// src/features/contracting/components/ContractingDashboard.tsx
// Contracting manager dashboard - shows all recruits with carrier contract requests

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { carrierContractRequestService } from "@/services/recruiting/carrierContractRequestService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { FileCheck, Search, CheckCircle2, Clock, AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Get all contract requests across all recruits (RLS automatically filters by IMO)
  const { data: allRequests, isLoading } = useQuery({
    queryKey: ['all-carrier-contract-requests'],
    queryFn: async () => {
      const { supabase } = await import('@/services/base/supabase');
      const { data, error } = await supabase
        .from('carrier_contract_requests')
        .select(`
          *,
          carrier:carriers(id, name),
          recruit:user_profiles!recruit_id(id, first_name, last_name, email)
        `)
        .order('requested_date', { ascending: false });

      if (error) throw error;
      return (data || []) as ContractRequest[];
    },
  });

  // Filter by search query
  const filteredRequests = useMemo(() => {
    if (!allRequests) return [];
    if (!searchQuery) return allRequests;

    const query = searchQuery.toLowerCase();
    return allRequests.filter((req) =>
      req.recruit?.first_name?.toLowerCase().includes(query) ||
      req.recruit?.last_name?.toLowerCase().includes(query) ||
      req.recruit?.email?.toLowerCase().includes(query) ||
      req.carrier?.name?.toLowerCase().includes(query) ||
      req.writing_number?.toLowerCase().includes(query)
    );
  }, [allRequests, searchQuery]);

  // Paginate results
  const paginatedRequests = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = startIndex + PAGE_SIZE;
    return filteredRequests.slice(startIndex, endIndex);
  }, [filteredRequests, page]);

  const totalPages = Math.ceil(filteredRequests.length / PAGE_SIZE);

  // Reset to page 1 when search query changes
  useMemo(() => {
    setPage(1);
  }, [searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!allRequests) return { total: 0, requested: 0, in_progress: 0, writing_received: 0, completed: 0 };

    return {
      total: allRequests.length,
      requested: allRequests.filter((r) => r.status === 'requested').length,
      in_progress: allRequests.filter((r) => r.status === 'in_progress').length,
      writing_received: allRequests.filter((r) => r.status === 'writing_received').length,
      completed: allRequests.filter((r) => r.status === 'completed').length,
    };
  }, [allRequests]);

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
                  <TableRow key={request.id} className="h-9 hover:bg-muted/50">
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
                      <Badge className={`text-[9px] px-1.5 py-0 ${STATUS_COLORS[request.status] || 'bg-gray-100 text-gray-700'}`}>
                        {request.status.replace(/_/g, ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-1.5">
                      <span className="text-[11px] font-mono text-muted-foreground">
                        {request.writing_number || '-'}
                      </span>
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
                    <TableCell colSpan={7} className="text-center text-xs text-muted-foreground py-8">
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
            Showing {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, filteredRequests.length)} of {filteredRequests.length} contracts
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
    </div>
  );
}

export default ContractingDashboard;
