// /home/nneessen/projects/commissionTracker/src/features/policies/PolicyList.tsx

import React, { useState } from "react";
import {
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useCarriers } from "../../hooks/carriers";
import { useCommissions } from "../../hooks/commissions/useCommissions";
import { useUpdateCommissionStatus } from "../../hooks/commissions/useUpdateCommissionStatus";
import { useProcessChargeback } from "../../hooks/commissions/useProcessChargeback";
import { useCancelPolicy, useLapsePolicy, useReinstatePolicy } from "../../hooks/policies";
import { Policy, PolicyFilters, PolicyStatus } from "../../types/policy.types";
import { ProductType, CommissionStatus } from "../../types/commission.types";
import { calculateCommissionAdvance } from "../../utils/policyCalculations";
import { formatCurrency, formatDate } from "../../lib/format";

interface PolicyListProps {
  policies: Policy[];
  deletePolicy: (id: string) => void;
  updatePolicyStatus: (id: string, status: PolicyStatus) => void;
  filterPolicies: (filters: PolicyFilters) => Policy[];
  onEditPolicy: (policyId: string) => void;
}

type SortField =
  | "policyNumber"
  | "client"
  | "carrier"
  | "status"
  | "premium"
  | "commission"
  | "effectiveDate";
type SortDirection = "asc" | "desc";

const STATUS_BADGES: Record<PolicyStatus, string> = {
  pending: "pending",
  active: "active",
  lapsed: "lapsed",
  cancelled: "cancelled",
  matured: "matured",
};

const PRODUCT_ABBREV: Record<ProductType, string> = {
  whole_life: "Whole",
  term_life: "Term",
  universal_life: "UL",
  variable_life: "VL",
  health: "Health",
  disability: "Disability",
  annuity: "Ann",
};

const ITEMS_PER_PAGE = 25;

export const PolicyList: React.FC<PolicyListProps> = ({
  policies,
  deletePolicy,
  updatePolicyStatus,
  filterPolicies,
  onEditPolicy,
}) => {
  const { data: carriers = [] } = useCarriers();
  const { data: commissions = [] } = useCommissions();
  const { mutate: updateCommissionStatus } = useUpdateCommissionStatus();
  const { mutate: processChargeback } = useProcessChargeback();
  const { mutate: cancelPolicy } = useCancelPolicy();
  const { mutate: lapsePolicy } = useLapsePolicy();
  const { mutate: reinstatePolicy } = useReinstatePolicy();
  const getCarrierById = (id: string) => carriers.find((c) => c.id === id);

  // Chargeback modal state
  const [showChargebackModal, setShowChargebackModal] = useState(false);
  const [selectedCommission, setSelectedCommission] = useState<any>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  // Create a map of policy_id -> commission for quick lookup
  const commissionsByPolicy = commissions.reduce((acc, commission) => {
    if (commission.policyId) {
      acc[commission.policyId] = commission;
    }
    return acc;
  }, {} as Record<string, typeof commissions[0]>);

  const [filters, setFilters] = useState<PolicyFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("effectiveDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedPolicies = (() => {
    const filtered = filterPolicies({ ...filters, searchTerm });

    return [...filtered].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "policyNumber":
          aVal = a.policyNumber;
          bVal = b.policyNumber;
          break;
        case "client":
          aVal = a.client.name;
          bVal = b.client.name;
          break;
        case "carrier":
          aVal = getCarrierById(a.carrierId)?.name || "";
          bVal = getCarrierById(b.carrierId)?.name || "";
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        case "premium":
          aVal = a.annualPremium;
          bVal = b.annualPremium;
          break;
        case "commission":
          aVal = calculateCommissionAdvance(
            a.annualPremium,
            a.commissionPercentage,
            9, // Default advance months
          );
          bVal = calculateCommissionAdvance(
            b.annualPremium,
            b.commissionPercentage,
            9, // Default advance months
          );
          break;
        case "effectiveDate":
          aVal = new Date(a.effectiveDate).getTime();
          bVal = new Date(b.effectiveDate).getTime();
          break;
        default:
          aVal = new Date(a.effectiveDate).getTime();
          bVal = new Date(b.effectiveDate).getTime();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  })();

  // Pagination calculations
  const totalPages = Math.ceil(filteredAndSortedPolicies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedPolicies = filteredAndSortedPolicies.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filters, searchTerm]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleDeletePolicy = (policyId: string) => {
    if (window.confirm("Are you sure you want to delete this policy?")) {
      deletePolicy(policyId);
    }
  };

  const handleStatusChange = (commission: { id: string }, newStatus: string, policy: Policy) => {
    // The useUpdateCommissionStatus hook handles policy status updates
    updateCommissionStatus({
      commissionId: commission.id,
      status: newStatus as 'pending' | 'earned' | 'paid' | 'charged_back' | 'cancelled',
      policyId: policy.id  // This is the KEY - the hook handles the cascade
    }, {
      onError: (error) => {
        alert(`Failed to update status: ${error.message}`);
      }
    });
  };

  const handleChargeback = () => {
    if (!selectedCommission) return;

    // Process chargeback - calculates months_paid, chargeback_amount, and sets all fields atomically
    processChargeback(
      {
        commissionId: selectedCommission.id,
        policyId: selectedCommission.policyId
      },
      {
        onSuccess: () => {
          // Also update policy status to cancelled
          if (selectedCommission.policy) {
            updatePolicyStatus(selectedCommission.policy.id, 'cancelled');
          }
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
    if (!window.confirm("Are you sure you want to cancel this policy? This will calculate and apply any chargeback amounts.")) {
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
    if (!window.confirm("Mark this policy as lapsed? This will calculate and apply any chargeback amounts.")) {
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
          alert('Policy reinstated successfully. Any previous chargebacks have been reversed.');
        },
        onError: (error) => {
          alert(`Failed to reinstate policy: ${error.message}`);
        }
      }
    );
  };

  const SortHeader: React.FC<{
    field: SortField;
    children: React.ReactNode;
  }> = ({ field, children }) => (
    <TableHead
      className="py-2.5 px-3 font-medium text-muted-foreground whitespace-nowrap cursor-pointer select-none hover:text-foreground"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field &&
        (sortDirection === "asc" ? (
          <ChevronUp size={14} className="inline-block ml-1 align-middle" />
        ) : (
          <ChevronDown size={14} className="inline-block ml-1 align-middle" />
        ))}
    </TableHead>
  );

  return (
    <div className="space-y-4">
      {/* Compact Search and Filter Bar */}
      <div className="bg-gradient-to-br from-card to-muted/10 rounded-lg shadow-md overflow-hidden">
        <div className="flex gap-3 p-3 px-4 bg-gradient-to-r from-muted/50 to-card shadow-sm">
          <div className="flex-1 relative flex items-center">
            <Search size={16} className="absolute left-2.5 text-muted-foreground/60" />
            <input
              type="text"
              placeholder="Search policies, clients, carriers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full py-1.5 px-3 pl-9 bg-background/50 rounded-md text-[13px] outline-none transition-colors focus:bg-background focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            size="sm"
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-[13px] shadow-sm",
              showFilters && "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            <Filter size={16} />
            Filters
          </Button>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="flex gap-3 p-3 px-4 bg-gradient-to-r from-muted/30 to-card shadow-sm">
            <div className="flex flex-col gap-1 min-w-[120px]">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Status</label>
              <select
                value={filters.status || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    status: (e.target.value as PolicyStatus) || undefined,
                  }))
                }
                className="py-1 px-2 bg-background/50 rounded text-[13px] cursor-pointer outline-none focus:bg-background focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="lapsed">Lapsed</option>
                <option value="cancelled">Cancelled</option>
                <option value="matured">Matured</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[120px]">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Product</label>
              <select
                value={filters.product || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    product: (e.target.value as ProductType) || undefined,
                  }))
                }
                className="py-1 px-2 bg-background/50 rounded text-[13px] cursor-pointer outline-none focus:bg-background focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All</option>
                <option value="whole_life">Whole Life</option>
                <option value="term">Term Life</option>
                <option value="universal_life">Universal Life</option>
                <option value="indexed_universal_life">IUL</option>
                <option value="accidental">Accidental Death</option>
                <option value="final_expense">Final Expense</option>
                <option value="annuity">Annuity</option>
              </select>
            </div>
            <div className="flex flex-col gap-1 min-w-[120px]">
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Carrier</label>
              <select
                value={filters.carrierId || ""}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    carrierId: e.target.value || undefined,
                  }))
                }
                className="py-1 px-2 bg-background/50 rounded text-[13px] cursor-pointer outline-none focus:bg-background focus:ring-2 focus:ring-primary/20"
              >
                <option value="">All</option>
                {Array.from(new Set(policies.map((p) => p.carrierId))).map(
                  (carrierId) => {
                    const carrier = getCarrierById(carrierId);
                    return carrier ? (
                      <option key={carrierId} value={carrierId}>
                        {carrier.name}
                      </option>
                    ) : null;
                  },
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Policy Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <SortHeader field="policyNumber">Policy</SortHeader>
            <SortHeader field="client">Client</SortHeader>
            <SortHeader field="carrier">Carrier/Product</SortHeader>
            <SortHeader field="status">Status</SortHeader>
            <SortHeader field="premium">Premium</SortHeader>
            <SortHeader field="commission">Commission</SortHeader>
            <TableHead className="py-2.5 px-3 font-medium text-muted-foreground whitespace-nowrap">Comm Status</TableHead>
            <SortHeader field="effectiveDate">Effective</SortHeader>
            <TableHead className="py-2.5 px-3 font-medium text-muted-foreground whitespace-nowrap">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedPolicies.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center py-10 px-5 text-muted-foreground text-sm">
                No policies found. Submit a policy to get started.
              </TableCell>
            </TableRow>
          ) : (
            paginatedPolicies.map((policy) => {
              const carrier = getCarrierById(policy.carrierId);
              const policyCommission = commissionsByPolicy[policy.id];

              // Calculate commission advance: Monthly Premium × Advance Months × Commission Rate
              // Note: Using default 9 months advance - actual advances are tracked in commissions table
              const commission = calculateCommissionAdvance(
                policy.annualPremium,
                policy.commissionPercentage,
                9, // Default advance months
              );

              return (
                <TableRow key={policy.id} className="transition-all duration-200 hover:bg-accent/10">
                  <TableCell className="py-2.5 px-3 text-foreground font-medium">{policy.policyNumber}</TableCell>
                  <TableCell className="py-2.5 px-3 text-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        {policy.client.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {policy.client.age}y • {policy.client.state}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-foreground">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">
                        {carrier?.name || "Unknown"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {PRODUCT_ABBREV[policy.product]}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-foreground">
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
                  <TableCell className="py-2.5 px-3 text-right text-foreground tabular-nums">
                    <div className="flex flex-col gap-0.5 items-end">
                      <span>{formatCurrency(policy.annualPremium)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {policy.paymentFrequency}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-right text-foreground tabular-nums">
                    <div className="flex flex-col gap-0.5 items-end">
                      <span className="text-success font-medium">{formatCurrency(commission)}</span>
                      <span className="text-[11px] text-muted-foreground">
                        {(policy.commissionPercentage * 100).toFixed(0)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-center min-w-[100px]">
                    {policyCommission ? (
                      <Select
                        value={policyCommission.status === 'charged_back' || policyCommission.status === 'earned' ? 'cancelled' : policyCommission.status}
                        onValueChange={(value) => handleStatusChange(policyCommission, value, policy)}
                      >
                        <SelectTrigger
                          className={cn(
                          "h-7 text-xs w-[110px] shadow-md hover:shadow-lg transition-shadow",
                          policyCommission.status === 'paid'
                            ? "bg-success/10 text-success"
                            : policyCommission.status === 'cancelled' || policyCommission.status === 'charged_back'
                            ? "bg-destructive/10 text-destructive"
                            : "bg-warning/10 text-warning"
                        )}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending" className="text-xs">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-warning" />
                              Pending
                            </span>
                          </SelectItem>
                          <SelectItem value="paid" className="text-xs">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-success" />
                              Paid
                            </span>
                          </SelectItem>
                          <SelectItem value="cancelled" className="text-xs">
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-destructive" />
                              Cancelled
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-muted-foreground/60 text-xs">No commission</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-[12px] text-muted-foreground">{formatDate(policy.effectiveDate)}</TableCell>
                  <TableCell className="py-2.5 px-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                        >
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
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
                          className="text-destructive focus:text-destructive"
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-muted/30 to-card rounded-lg shadow-sm">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, filteredAndSortedPolicies.length)} of {filteredAndSortedPolicies.length} policies
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <Button
                    key={i}
                    onClick={() => setCurrentPage(pageNum)}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Items per page selector */}
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px] text-xs ml-4">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Chargeback Modal - Using shadcn Dialog */}
      <Dialog open={showChargebackModal} onOpenChange={setShowChargebackModal}>
        <DialogContent className="w-[90%] max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cancel Commission</DialogTitle>
            <DialogDescription>
              This will cancel the commission and policy
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-gradient-to-br from-destructive/20 via-error/10 to-card rounded-md shadow-sm mb-4">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-error flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-error mb-1">
                  This will cancel the commission and policy
                </div>
                <div className="text-sm text-destructive/80 leading-relaxed">
                  Chargeback amount will be calculated automatically: <strong>Advance - Earned</strong>
                </div>
              </div>
            </div>
          </div>

          {selectedCommission && (
            <div className="p-3 bg-gradient-to-br from-muted/30 to-card rounded-md shadow-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Advance Amount</div>
                  <div className="text-base font-semibold text-foreground">
                    {formatCurrency(selectedCommission.amount || 0)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Current Status</div>
                  <div className="text-base font-semibold text-foreground capitalize">
                    {selectedCommission.status}
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={() => setShowChargebackModal(false)}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleChargeback}
              variant="destructive"
              size="sm"
            >
              Cancel Commission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};