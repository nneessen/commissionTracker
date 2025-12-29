// src/features/contracting/components/ContractingDashboard.tsx
// Dashboard for managing carrier contracts - matches RecruitingDashboard pattern

import { useState, useMemo } from "react";
import {
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { useContracts, useContractStats } from "../hooks/useContracts";
import type {
  ContractStatus,
  ContractFilters,
} from "../services/contractingService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_CONFIG: Record<
  ContractStatus,
  { label: string; color: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pending",
    color: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300",
    icon: Clock,
  },
  submitted: {
    label: "Submitted",
    color: "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400",
    icon: Send,
  },
  approved: {
    label: "Approved",
    color:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400",
    icon: XCircle,
  },
  terminated: {
    label: "Terminated",
    color: "bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400",
    icon: XCircle,
  },
};

export function ContractingDashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Build filters
  const filters: ContractFilters = useMemo(() => {
    const f: ContractFilters = {};
    if (searchQuery) {
      f.search = searchQuery;
    }
    if (statusFilter !== "all") {
      f.status = [statusFilter as ContractStatus];
    }
    return f;
  }, [searchQuery, statusFilter]);

  const { data: contractsData, isLoading } = useContracts(
    filters,
    currentPage,
    pageSize,
  );
  const { data: stats } = useContractStats();

  const contracts = contractsData?.data || [];
  const totalCount = contractsData?.count || 0;
  const totalPages = contractsData?.totalPages || 1;

  const handleExport = () => {
    toast.success("Export feature coming soon!");
  };

  const handleAddContract = () => {
    toast.success("Add contract feature coming soon!");
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
      {/* Compact Header with inline stats */}
      <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Contracting Hub
            </h1>
          </div>

          {/* Inline compact stats */}
          <div className="flex items-center gap-3 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats?.total || 0}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">total</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-zinc-500" />
              <span className="font-medium text-zinc-900 dark:text-zinc-100">
                {stats?.pending || 0}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">pending</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <Send className="h-3 w-3 text-blue-500" />
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {stats?.submitted || 0}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                submitted
              </span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {stats?.approved || 0}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">approved</span>
            </div>
            <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-700" />
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" />
              <span className="font-medium text-red-600 dark:text-red-400">
                {stats?.rejected || 0}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">rejected</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-zinc-400" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-6 w-32 pl-7 text-[10px] border-zinc-200 dark:border-zinc-700"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-6 w-24 text-[10px] border-zinc-200 dark:border-zinc-700">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-[11px]">
                All
              </SelectItem>
              <SelectItem value="pending" className="text-[11px]">
                Pending
              </SelectItem>
              <SelectItem value="submitted" className="text-[11px]">
                Submitted
              </SelectItem>
              <SelectItem value="approved" className="text-[11px]">
                Approved
              </SelectItem>
              <SelectItem value="rejected" className="text-[11px]">
                Rejected
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleExport}
            className="h-6 text-[10px] px-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            <Download className="h-3 w-3 mr-1" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={handleAddContract}
            className="h-6 text-[10px] px-2"
          >
            <Plus className="h-3 w-3 mr-1" />
            Add Contract
          </Button>
        </div>
      </div>

      {/* Main Content - Table */}
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
              <TableHeader className="sticky top-0 z-10">
                <TableRow className="h-8 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-700">
                  <TableHead className="h-8 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 w-[200px]">
                    Agent
                  </TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 w-[150px]">
                    Carrier
                  </TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 w-[100px]">
                    Status
                  </TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 w-[120px]">
                    Writing #
                  </TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 w-[100px]">
                    Requested
                  </TableHead>
                  <TableHead className="h-8 text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 w-[90px]">
                    Updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => {
                  const agentName =
                    contract.agent?.first_name && contract.agent?.last_name
                      ? `${contract.agent.first_name} ${contract.agent.last_name}`
                      : contract.agent?.email || "Unknown";
                  const statusConfig =
                    STATUS_CONFIG[contract.status as ContractStatus] ||
                    STATUS_CONFIG.pending;

                  return (
                    <TableRow
                      key={contract.id}
                      className="h-10 border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors"
                    >
                      <TableCell className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-semibold text-zinc-600 dark:text-zinc-300 shrink-0">
                            {agentName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium text-[11px] text-zinc-900 dark:text-zinc-100 truncate">
                              {agentName}
                            </div>
                            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                              {contract.agent?.email}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[11px] text-zinc-900 dark:text-zinc-100">
                          {contract.carrier?.name || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] h-5 px-1.5 ${statusConfig.color}`}
                        >
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[11px] text-zinc-600 dark:text-zinc-300 font-mono">
                          {contract.writing_number || "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                          {contract.requested_date
                            ? format(
                                new Date(contract.requested_date),
                                "MMM d, yyyy",
                              )
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                          {contract.updated_at
                            ? formatDistanceToNow(
                                new Date(contract.updated_at),
                                {
                                  addSuffix: true,
                                },
                              )
                            : "-"}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {contracts.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center text-[11px] text-zinc-500 dark:text-zinc-400 py-8"
                    >
                      {searchQuery || statusFilter !== "all"
                        ? "No contracts match your filters"
                        : "No contracts yet"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-1.5 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Rows:
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-5 w-12 text-[10px] border-zinc-200 dark:border-zinc-700">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem
                    key={size}
                    value={size.toString()}
                    className="text-[11px]"
                  >
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              of {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              size="sm"
              variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContractingDashboard;
