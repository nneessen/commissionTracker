// src/features/policies/PolicyList.tsx

import React, { useState, useEffect } from "react";
import {
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  XCircle,
  Plus,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateForDB, parseLocalDate } from "@/lib/date";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCarriers } from "../../hooks/carriers";
import { useCommissions } from "../../hooks/commissions/useCommissions";
import { useUpdateCommissionStatus } from "../../hooks/commissions/useUpdateCommissionStatus";
import { useProcessChargeback } from "../../hooks/commissions/useProcessChargeback";
import { useCancelPolicy, useLapsePolicy, useReinstatePolicy, useDeletePolicy } from "../../hooks/policies";
import { usePoliciesView } from "../../hooks/policies/usePoliciesView";
import { Policy, PolicyFilters, PolicyStatus } from "../../types/policy.types";
import { ProductType, CommissionStatus } from "../../types/commission.types";
import { formatCurrency, formatDate } from "../../lib/format";
import { normalizeDatabaseDate } from "../../lib/date";

interface PolicyListProps {
  onEditPolicy: (policyId: string) => void;
  onNewPolicy: () => void;
}

const PRODUCT_ABBREV: Record<string, string> = {
  whole_life: "Whole",
  term_life: "Term",
  universal_life: "UL",
  indexed_universal_life: "IUL",
  variable_life: "VL",
  variable_universal_life: "VUL",
  final_expense: "Final",
  accidental: "AD&D",
  health: "Health",
  disability: "Disability",
  annuity: "Ann",
};

export const PolicyList: React.FC<PolicyListProps> = ({ onEditPolicy, onNewPolicy }) => {
  // Use server-side pagination hook
  const {
    policies,
    isLoading,
    isFetching,
    error,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    filters,
    setFilters,
    clearFilters,
    filterCount,
    sortConfig,
    toggleSort,
    refresh,
    metrics,
  } = usePoliciesView();

  const { data: carriers = [] } = useCarriers();
  const { data: commissions = [] } = useCommissions();
  const { mutate: updateCommissionStatus } = useUpdateCommissionStatus();
  const { mutate: processChargeback } = useProcessChargeback();
  const { mutate: cancelPolicy } = useCancelPolicy();
  const { mutate: lapsePolicy } = useLapsePolicy();
  const { mutate: reinstatePolicy } = useReinstatePolicy();
  const { mutate: deletePolicy } = useDeletePolicy();
  const getCarrierById = (id: string) => carriers.find((c) => c.id === id);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showChargebackModal, setShowChargebackModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<any>(null);

  // Create a map of policy_id -> commission for quick lookup
  const commissionsByPolicy = commissions.reduce((acc, commission) => {
    if (commission.policyId) {
      acc[commission.policyId] = commission;
    }
    return acc;
  }, {} as Record<string, typeof commissions[0]>);

  // Get commissions for current page policies to calculate commission metrics
  const policyIds = new Set(policies.map(p => p.id));
  const relevantCommissions = commissions.filter(c => c.policyId && policyIds.has(c.policyId));
  const earnedCommission = relevantCommissions.reduce((sum, c) => sum + (c.earnedAmount || 0), 0);
  const pendingCommission = relevantCommissions.filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + (c.amount || 0), 0);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters({ ...filters, searchTerm });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleDeletePolicy = (policyId: string) => {
    if (window.confirm("Are you sure you want to delete this policy?")) {
      deletePolicy(policyId);
    }
  };

  const handleStatusChange = (commission: { id: string }, newStatus: string, policy: Policy) => {
    updateCommissionStatus({
      commissionId: commission.id,
      status: newStatus as 'pending' | 'earned' | 'paid' | 'charged_back' | 'cancelled',
      policyId: policy.id
    }, {
      onError: (error) => {
        alert(`Failed to update status: ${error.message}`);
      }
    });
  };

  const handleChargeback = () => {
    if (!selectedCommission) return;

    processChargeback(
      {
        commissionId: selectedCommission.id,
        policyId: selectedCommission.policyId
      },
      {
        onSuccess: () => {
          setShowChargebackModal(false);
          setSelectedCommission(null);
        },
        onError: (error) => {
          alert(`Failed to apply chargeback: ${error.message}`);
        }
      }
    );
  };

  const handleCancelPolicy = (policyId: string) => {
    if (!window.confirm("Are you sure you want to cancel this policy?")) {
      return;
    }

    cancelPolicy(
      {
        policyId,
        reason: 'Manually cancelled by user',
        cancelDate: new Date()
      },
      {
        onSuccess: (result) => {
          if (result.chargeback && result.chargeback.amount > 0) {
            alert(`Policy cancelled. Chargeback amount: ${formatCurrency(result.chargeback.amount)}`);
          } else {
            alert('Policy cancelled successfully.');
          }
        },
        onError: (error) => {
          alert(`Failed to cancel policy: ${error.message}`);
        }
      }
    );
  };

  const handleLapsePolicy = (policyId: string) => {
    if (!window.confirm("Mark this policy as lapsed?")) {
      return;
    }

    lapsePolicy(
      {
        policyId,
        lapseDate: new Date(),
        reason: 'Client stopped paying premiums'
      },
      {
        onSuccess: (result) => {
          if (result.chargeback && result.chargeback.amount > 0) {
            alert(`Policy marked as lapsed. Chargeback amount: ${formatCurrency(result.chargeback.amount)}`);
          } else {
            alert('Policy marked as lapsed.');
          }
        },
        onError: (error) => {
          alert(`Failed to mark policy as lapsed: ${error.message}`);
        }
      }
    );
  };

  const handleReinstatePolicy = (policyId: string) => {
    const reason = window.prompt("Please provide a reason for reinstating this policy:");
    if (!reason) return;

    reinstatePolicy(
      {
        policyId,
        reason
      },
      {
        onSuccess: () => {
          alert('Policy reinstated successfully.');
        },
        onError: (error) => {
          alert(`Failed to reinstate policy: ${error.message}`);
        }
      }
    );
  };

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header with Title and Metrics Bar */}
      <div className="bg-background border-b border-border/50">
        {/* Title and New Policy Button */}
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-2xl font-semibold">Policies</h1>
          <Button onClick={onNewPolicy} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            New Policy
          </Button>
        </div>

        {/* Smart Contextual Metrics Bar */}
        <div className="px-6 pb-3">
          {metrics ? (
            <>
              {/* Scope Indicator */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {filterCount > 0 ? 'Filtered Results' : 'All Policies'}
                </span>
                {filterCount > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
                    {filterCount} {filterCount === 1 ? 'filter' : 'filters'} active
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-8 text-sm">
                {/* Count metrics */}
                <div className="flex items-center gap-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-xl font-bold">{metrics.totalPolicies}</span>
                    <span className="text-xs text-muted-foreground">total</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="font-medium">{metrics.activePolicies}</span>
                    <span className="text-muted-foreground">active</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-yellow-500" />
                    <span className="font-medium">{metrics.pendingPolicies}</span>
                    <span className="text-muted-foreground">pending</span>
                  </div>
                </div>

                {/* Premium metrics */}
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-semibold">${(metrics.totalPremium / 1000).toFixed(1)}k</span>
                    <span className="text-muted-foreground ml-1">total premium</span>
                  </div>
                  <div className="text-muted-foreground">•</div>
                  <div>
                    <span className="font-semibold">${(metrics.avgPremium / 1000).toFixed(1)}k</span>
                    <span className="text-muted-foreground ml-1">avg</span>
                  </div>
                </div>

                {/* Commission metrics - Page-specific */}
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-semibold text-green-600">${(earnedCommission / 1000).toFixed(1)}k</span>
                    <span className="text-muted-foreground ml-1">earned (page)</span>
                  </div>
                  <div className="text-muted-foreground">•</div>
                  <div>
                    <span className="font-semibold text-yellow-600">${(pendingCommission / 1000).toFixed(1)}k</span>
                    <span className="text-muted-foreground ml-1">pending (page)</span>
                  </div>
                </div>

                {/* YTD metrics */}
                <div className="flex items-center gap-4">
                  <div>
                    <span className="font-medium">{metrics.ytdPolicies}</span>
                    <span className="text-muted-foreground ml-1">YTD policies</span>
                  </div>
                  <div>
                    <span className="font-medium">${(metrics.ytdPremium / 1000).toFixed(1)}k</span>
                    <span className="text-muted-foreground ml-1">YTD premium</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Loading metrics...</div>
          )}
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-background border-b border-border/50">
        <div className="flex gap-3 p-2 px-4">
          <div className="flex-1 relative flex items-center">
            <Search size={16} className="absolute left-2.5 text-muted-foreground/60" />
            <Input
              type="text"
              placeholder="Search policies, clients, carriers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-9 text-sm"
            />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant={showFilters ? "default" : "outline"}
            size="sm"
            className="h-8"
          >
            <Filter size={14} className="mr-1" />
            Filters {filterCount > 0 && `(${filterCount})`}
          </Button>
          {filterCount > 0 && (
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
            >
              Clear
            </Button>
          )}
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="flex gap-3 p-2 px-4 bg-muted/50">
            <Select
              value={filters.status || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  status: value === "all" ? undefined : value as PolicyStatus
                })
              }
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="lapsed">Lapsed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.product || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  product: value === "all" ? undefined : value as ProductType
                })
              }
            >
              <SelectTrigger className="h-8 w-[140px]">
                <SelectValue placeholder="Product" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Products</SelectItem>
                <SelectItem value="whole_life">Whole Life</SelectItem>
                <SelectItem value="term_life">Term Life</SelectItem>
                <SelectItem value="universal_life">Universal Life</SelectItem>
                <SelectItem value="indexed_universal_life">IUL</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.carrierId || "all"}
              onValueChange={(value) =>
                setFilters({
                  ...filters,
                  carrierId: value === "all" ? undefined : value
                })
              }
            >
              <SelectTrigger className="h-8 w-[160px]">
                <SelectValue placeholder="Carrier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Carriers</SelectItem>
                {carriers.map(carrier => (
                  <SelectItem key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <DateRangePicker
              value={{
                from: filters.effectiveDateFrom ? parseLocalDate(filters.effectiveDateFrom) : undefined,
                to: filters.effectiveDateTo ? parseLocalDate(filters.effectiveDateTo) : undefined
              }}
              onChange={(range) => {
                setFilters({
                  ...filters,
                  effectiveDateFrom: range.from ? formatDateForDB(range.from) : undefined,
                  effectiveDateTo: range.to ? formatDateForDB(range.to) : undefined
                });
              }}
              placeholder="Effective Date Range"
              className="h-8"
            />
          </div>
        )}
      </div>

      {/* Table Container - Scrollable with Fixed Height */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10 border-b border-border/50">
            <TableRow className="hover:bg-transparent">
              <TableHead
                className="h-10 px-3 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort('policy_number')}
              >
                <div className="flex items-center gap-1">
                  Policy
                  {sortConfig.field === 'policy_number' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="h-10 px-3 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort('client')}
              >
                <div className="flex items-center gap-1">
                  Client
                  {sortConfig.field === 'client' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </TableHead>
              <TableHead className="h-10 px-3">Carrier/Product</TableHead>
              <TableHead
                className="h-10 px-3 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort('status')}
              >
                <div className="flex items-center gap-1">
                  Status
                  {sortConfig.field === 'status' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </TableHead>
              <TableHead
                className="h-10 px-3 text-right cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort('annual_premium')}
              >
                <div className="flex items-center justify-end gap-1">
                  Premium
                  {sortConfig.field === 'annual_premium' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </TableHead>
              <TableHead className="h-10 px-3 text-right">Commission</TableHead>
              <TableHead className="h-10 px-3 text-center">Comm Status</TableHead>
              <TableHead
                className="h-10 px-3 cursor-pointer hover:text-foreground transition-colors"
                onClick={() => toggleSort('effective_date')}
              >
                <div className="flex items-center gap-1">
                  Effective
                  {sortConfig.field === 'effective_date' && (
                    sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                  )}
                </div>
              </TableHead>
              <TableHead className="h-10 px-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-20">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="text-sm text-muted-foreground">Loading policies...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-20">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-destructive" />
                    <span className="text-sm text-destructive">Error: {error}</span>
                    <Button onClick={refresh} size="sm" variant="outline">Retry</Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-20">
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-8 w-8 text-muted-foreground/50" />
                    <span className="text-sm text-muted-foreground">
                      {filterCount > 0 ? 'No policies match your filters' : 'No policies found'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              policies.map((policy) => {
                const carrier = getCarrierById(policy.carrierId);
                const policyCommission = commissionsByPolicy[policy.id];
                // Use actual commission amount from database (includes contract level multiplier)
                // Fallback to 0 if no commission record exists
                const commission = policyCommission?.amount || 0;

                return (
                  <TableRow
                    key={policy.id}
                  >
                    <TableCell className="py-1.5 px-3 text-foreground font-medium">
                      {policy.policyNumber}
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {policy.client.name}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {policy.client.age}y • {policy.client.state}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-foreground">
                          {carrier?.name || "Unknown"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {PRODUCT_ABBREV[policy.product] || policy.product}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <span
                        className={cn(
                          "inline-block py-0.5 px-2 rounded-xl text-[11px] font-medium capitalize",
                          policy.status === "pending" && "bg-warning/20 text-warning",
                          policy.status === "active" && "bg-success/20 text-success",
                          policy.status === "lapsed" && "bg-destructive/20 text-destructive",
                          policy.status === "cancelled" && "bg-muted/30 text-muted-foreground",
                          policy.status === "matured" && "bg-info/20 text-info"
                        )}
                      >
                        {policy.status}
                      </span>
                    </TableCell>
                    <TableCell className="py-1.5 px-3 text-right tabular-nums">
                      <div className="flex flex-col gap-0.5 items-end">
                        <span>{formatCurrency(policy.annualPremium)}</span>
                        <span className="text-[11px] text-muted-foreground">
                          annual
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-3 text-right tabular-nums">
                      <div className="flex flex-col gap-0.5 items-end">
                        <span className="text-success font-medium">{formatCurrency(commission)}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {(policy.commissionPercentage * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 px-3 text-center">
                      {policyCommission ? (
                        <Select
                          value={policyCommission.status === 'charged_back' || policyCommission.status === 'earned' ? 'cancelled' : policyCommission.status}
                          onValueChange={(value) => handleStatusChange(policyCommission, value, policy)}
                        >
                          <SelectTrigger
                            className={cn(
                              "h-7 text-xs w-[110px] !px-2 !gap-1 font-medium border-2",
                              policyCommission.status === 'paid' && "!bg-green-100 !text-green-800 !border-green-300 hover:!bg-green-200",
                              policyCommission.status === 'pending' && "!bg-yellow-100 !text-yellow-800 !border-yellow-300 hover:!bg-yellow-200",
                              (policyCommission.status === 'cancelled' || policyCommission.status === 'charged_back') && "!bg-red-100 !text-red-800 !border-red-300 hover:!bg-red-200"
                            )}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="!bg-white dark:!bg-gray-800 border-2">
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-muted-foreground/60 text-xs">No commission</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 px-3 text-[12px] text-muted-foreground">
                      {formatDate(policy.effectiveDate)}
                    </TableCell>
                    <TableCell className="py-1.5 px-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => onEditPolicy(policy.id)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Policy
                          </DropdownMenuItem>
                          {policy.status === 'active' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleCancelPolicy(policy.id)}
                                className="text-warning"
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel Policy
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleLapsePolicy(policy.id)}
                                className="text-warning"
                              >
                                <AlertCircle className="mr-2 h-4 w-4" />
                                Mark as Lapsed
                              </DropdownMenuItem>
                            </>
                          )}
                          {(policy.status === 'cancelled' || policy.status === 'lapsed') && (
                            <DropdownMenuItem
                              onClick={() => handleReinstatePolicy(policy.id)}
                              className="text-success"
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Reinstate Policy
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeletePolicy(policy.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Policy
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Server-side Pagination Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-background border-t border-border/50 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
            <span className="font-medium text-foreground">
              {Math.min(currentPage * pageSize, totalItems)}
            </span> of{' '}
            <span className="font-medium text-foreground">{totalItems}</span> policies
          </div>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / page</SelectItem>
              <SelectItem value="25">25 / page</SelectItem>
              <SelectItem value="50">50 / page</SelectItem>
              <SelectItem value="100">100 / page</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          <Button
            onClick={previousPage}
            disabled={currentPage === 1}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1">
            {(() => {
              const pages = [];
              const maxVisible = 5;
              let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
              let end = Math.min(totalPages, start + maxVisible - 1);

              if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
              }

              if (start > 1) {
                pages.push(
                  <Button
                    key={1}
                    onClick={() => goToPage(1)}
                    variant="outline"
                    size="sm"
                    className="h-8 min-w-8 px-2"
                  >
                    1
                  </Button>
                );
                if (start > 2) {
                  pages.push(<span key="dots1" className="px-1 text-muted-foreground">...</span>);
                }
              }

              for (let i = start; i <= end; i++) {
                pages.push(
                  <Button
                    key={i}
                    onClick={() => goToPage(i)}
                    variant={currentPage === i ? "default" : "outline"}
                    size="sm"
                    className="h-8 min-w-8 px-2"
                  >
                    {i}
                  </Button>
                );
              }

              if (end < totalPages) {
                if (end < totalPages - 1) {
                  pages.push(<span key="dots2" className="px-1 text-muted-foreground">...</span>);
                }
                pages.push(
                  <Button
                    key={totalPages}
                    onClick={() => goToPage(totalPages)}
                    variant="outline"
                    size="sm"
                    className="h-8 min-w-8 px-2"
                  >
                    {totalPages}
                  </Button>
                );
              }

              return pages;
            })()}
          </div>

          <Button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          <Button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};