// /home/nneessen/projects/commissionTracker/src/features/policies/PolicyList.tsx

import React, { useState } from "react";
import {
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
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
          aVal = a.effectiveDate;
          bVal = b.effectiveDate;
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });
  })();

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
    <th
      className="py-2.5 px-3 text-left font-medium text-gray-500 whitespace-nowrap cursor-pointer select-none hover:text-gray-900"
      onClick={() => handleSort(field)}
    >
      {children}
      {sortField === field &&
        (sortDirection === "asc" ? (
          <ChevronUp size={14} className="inline-block ml-1 align-middle" />
        ) : (
          <ChevronDown size={14} className="inline-block ml-1 align-middle" />
        ))}
    </th>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Compact Search and Filter Bar */}
      <div className="flex gap-3 p-3 px-4 bg-gray-50 border-b border-gray-200">
        <div className="flex-1 relative flex items-center">
          <Search size={16} className="absolute left-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search policies, clients, carriers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-1.5 px-3 pl-9 border border-gray-300 rounded-md text-[13px] outline-none transition-colors focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
          />
        </div>
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          size="sm"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 text-[13px]",
            showFilters && "bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
          )}
        >
          <Filter size={16} />
          Filters
        </Button>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="flex gap-3 p-3 px-4 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col gap-1 min-w-[120px]">
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Status</label>
            <select
              value={filters.status || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: (e.target.value as PolicyStatus) || undefined,
                }))
              }
              className="py-1 px-2 border border-gray-300 rounded text-[13px] bg-white cursor-pointer outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]"
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
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Product</label>
            <select
              value={filters.product || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  product: (e.target.value as ProductType) || undefined,
                }))
              }
              className="py-1 px-2 border border-gray-300 rounded text-[13px] bg-white cursor-pointer outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]"
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
            <label className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">Carrier</label>
            <select
              value={filters.carrierId || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  carrierId: e.target.value || undefined,
                }))
              }
              className="py-1 px-2 border border-gray-300 rounded text-[13px] bg-white cursor-pointer outline-none focus:border-blue-500 focus:shadow-[0_0_0_2px_rgba(59,130,246,0.1)]"
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

      {/* Condensed Policy Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <SortHeader field="policyNumber">Policy</SortHeader>
              <SortHeader field="client">Client</SortHeader>
              <SortHeader field="carrier">Carrier/Product</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="premium">Premium</SortHeader>
              <SortHeader field="commission">Commission</SortHeader>
              <th className="py-2.5 px-3 text-left font-medium text-gray-500 whitespace-nowrap">Comm Status</th>
              <SortHeader field="effectiveDate">Effective</SortHeader>
              <th className="py-2.5 px-3 text-left font-medium text-gray-500 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPolicies.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-10 px-5 text-gray-500 text-sm">
                  No policies found. Submit a policy to get started.
                </td>
              </tr>
            ) : (
              filteredAndSortedPolicies.map((policy) => {
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
                  <tr key={policy.id} className="border-b border-gray-100 transition-colors hover:bg-gray-50">
                    <td className="py-2.5 px-3 text-gray-900 font-medium">{policy.policyNumber}</td>
                    <td className="py-2.5 px-3 text-gray-900">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-900">
                          {policy.client.name}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {policy.client.age}y • {policy.client.state}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-900">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-gray-900">
                          {carrier?.name || "Unknown"}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          {PRODUCT_ABBREV[policy.product]}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-gray-900">
                      <span
                        className={cn(
                          "inline-block py-0.5 px-2 rounded-xl text-[11px] font-medium capitalize",
                          policy.status === "pending" && "bg-amber-100 text-amber-900",
                          policy.status === "active" && "bg-green-100 text-green-900",
                          policy.status === "lapsed" && "bg-red-100 text-red-900",
                          policy.status === "cancelled" && "bg-gray-100 text-gray-700",
                          policy.status === "matured" && "bg-blue-100 text-blue-900"
                        )}
                      >
                        {policy.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-900 tabular-nums">
                      <div className="flex flex-col gap-0.5 items-end">
                        <span>{formatCurrency(policy.annualPremium)}</span>
                        <span className="text-[11px] text-gray-500">
                          {policy.paymentFrequency}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-gray-900 tabular-nums">
                      <div className="flex flex-col gap-0.5 items-end">
                        <span className="text-green-600 font-medium">{formatCurrency(commission)}</span>
                        <span className="text-[11px] text-gray-500">
                          {(policy.commissionPercentage * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center min-w-[100px]">
                      {policyCommission ? (
                        <Select
                          value={policyCommission.status}
                          onValueChange={(value) => handleStatusChange(policyCommission, value, policy)}
                        >
                          <SelectTrigger
                            className={cn(
                            "h-7 text-xs w-[110px] border-gray-300",
                            policyCommission.status === 'charged_back' || policyCommission.status === 'cancelled'
                              ? "text-destructive"
                              : policyCommission.status === 'paid'
                              ? "text-success"
                              : policyCommission.status === 'earned'
                              ? "text-info"
                              : "text-warning"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-gray-300">
                            <SelectItem value="pending" className="text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-warning" />
                                Pending
                              </span>
                            </SelectItem>
                            <SelectItem value="earned" className="text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-info" />
                                Earned
                              </span>
                            </SelectItem>
                            <SelectItem value="paid" className="text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-success" />
                                Paid
                              </span>
                            </SelectItem>
                            <SelectItem value="charged_back" className="text-xs">
                              <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-destructive" />
                                Charged Back
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
                    </td>
                    <td className="py-2.5 px-3 text-[12px] text-gray-500">{formatDate(policy.effectiveDate)}</td>
                    <td className="py-2.5 px-3">
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
                        <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-gray-900 border-gray-300">
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
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Chargeback Modal */}
      {showChargebackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={() => setShowChargebackModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-[90%] max-w-[500px] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 px-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Cancel Commission</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowChargebackModal(false)}
                className="h-8 w-8 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              >
                ×
              </Button>
            </div>
            <div className="p-6">
              <div className="p-4 bg-red-50 rounded-md border border-red-200 mb-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-error flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-error mb-1">
                      This will cancel the commission and policy
                    </div>
                    <div className="text-sm text-red-700 leading-relaxed">
                      Chargeback amount will be calculated automatically: <strong>Advance - Earned</strong>
                    </div>
                  </div>
                </div>
              </div>
              {selectedCommission && (
                <div className="p-3 bg-muted/20 rounded-md border border-border">
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
            </div>
            <div className="flex justify-end gap-3 p-4 px-6 border-t border-gray-200 bg-gray-50">
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
                size="sm"
                className="bg-error border-error text-white"
              >
                Cancel Commission
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
