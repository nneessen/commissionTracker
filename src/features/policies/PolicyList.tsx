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
      let aVal: any, bVal: any;

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

  const handleStatusChange = (commission: any, newStatus: string, policy: Policy) => {
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
    <th className="sortable" onClick={() => handleSort(field)}>
      {children}
      {sortField === field &&
        (sortDirection === "asc" ? (
          <ChevronUp size={14} />
        ) : (
          <ChevronDown size={14} />
        ))}
    </th>
  );

  return (
    <div className="policy-list">
      {/* Compact Search and Filter Bar */}
      <div className="search-bar">
        <div className="search-input-wrapper">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search policies, clients, carriers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`filter-toggle ${showFilters ? "active" : ""}`}
        >
          <Filter size={16} />
          Filters
        </button>
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: (e.target.value as PolicyStatus) || undefined,
                }))
              }
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="lapsed">Lapsed</option>
              <option value="cancelled">Cancelled</option>
              <option value="matured">Matured</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Product</label>
            <select
              value={filters.product || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  product: (e.target.value as ProductType) || undefined,
                }))
              }
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
          <div className="filter-group">
            <label>Carrier</label>
            <select
              value={filters.carrierId || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  carrierId: e.target.value || undefined,
                }))
              }
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
      <div className="policy-table-container">
        <table className="policy-table">
          <thead>
            <tr>
              <SortHeader field="policyNumber">Policy</SortHeader>
              <SortHeader field="client">Client</SortHeader>
              <SortHeader field="carrier">Carrier/Product</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="premium">Premium</SortHeader>
              <SortHeader field="commission">Commission</SortHeader>
              <th>Comm Status</th>
              <SortHeader field="effectiveDate">Effective</SortHeader>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPolicies.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-message">
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
                  <tr key={policy.id}>
                    <td className="policy-number">{policy.policyNumber}</td>
                    <td>
                      <div className="client-info">
                        <span className="client-name">
                          {policy.client.name}
                        </span>
                        <span className="client-details">
                          {policy.client.age}y • {policy.client.state}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="carrier-info">
                        <span className="carrier-name">
                          {carrier?.name || "Unknown"}
                        </span>
                        <span className="product-type">
                          {PRODUCT_ABBREV[policy.product]}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`status-badge ${STATUS_BADGES[policy.status]}`}
                      >
                        {policy.status}
                      </span>
                    </td>
                    <td className="numeric">
                      <div className="premium-info">
                        <span>{formatCurrency(policy.annualPremium)}</span>
                        <span className="payment-freq">
                          {policy.paymentFrequency}
                        </span>
                      </div>
                    </td>
                    <td className="numeric commission">
                      <div className="commission-info">
                        <span>{formatCurrency(commission)}</span>
                        <span className="commission-rate">
                          {(policy.commissionPercentage * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="commission-status">
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
                    <td className="date">{formatDate(policy.effectiveDate)}</td>
                    <td className="actions">
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
        <div className="modal-overlay" onClick={() => setShowChargebackModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cancel Commission</h3>
              <button onClick={() => setShowChargebackModal(false)} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-body">
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
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setShowChargebackModal(false)}
                className="btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChargeback}
                className="btn-primary bg-error border-error text-white"
              >
                Cancel Commission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
