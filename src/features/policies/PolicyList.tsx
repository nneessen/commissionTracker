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
} from "lucide-react";
import { useCarriers } from "../../hooks/carriers";
import { useCommissions } from "../../hooks/commissions/useCommissions";
import { useUpdateCommissionStatus } from "../../hooks/commissions/useUpdateCommissionStatus";
import { useProcessChargeback } from "../../hooks/commissions/useProcessChargeback";
import { Policy, PolicyFilters, PolicyStatus } from "../../types/policy.types";
import { ProductType } from "../../types/commission.types";
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
  term: "Term",
  universal_life: "UL",
  indexed_universal_life: "IUL",
  accidental: "Acc",
  final_expense: "FE",
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
    if (newStatus === 'cancelled') {
      // Open modal to confirm chargeback and cancel policy
      setSelectedCommission({ ...commission, policy });
      setShowChargebackModal(true);
    } else {
      // Direct status update for 'paid' - includes policy status update
      updateCommissionStatus({
        commissionId: commission.id,
        status: newStatus as any,
        policyId: policy.id
      });
    }
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
                        <select
                          value={
                            policyCommission.status === 'charged_back' || policyCommission.status === 'cancelled'
                              ? 'cancelled'
                              : policyCommission.status === 'pending' || policyCommission.status === 'earned'
                              ? 'paid'
                              : policyCommission.status
                          }
                          onChange={(e) => handleStatusChange(policyCommission, e.target.value, policy)}
                          className="status-select"
                          style={{
                            padding: '4px 6px',
                            fontSize: '12px',
                            borderRadius: '4px',
                            border: '1px solid #e2e8f0',
                            background: '#ffffff',
                            cursor: 'pointer',
                            fontWeight: 500,
                            color: policyCommission.status === 'charged_back' || policyCommission.status === 'cancelled' ? '#dc2626' : '#1a1a1a'
                          }}
                        >
                          <option value="paid">Paid</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      ) : (
                        <span style={{ color: '#999', fontSize: '12px' }}>No commission</span>
                      )}
                    </td>
                    <td className="date">{formatDate(policy.effectiveDate)}</td>
                    <td className="actions">
                      <button
                        onClick={() => onEditPolicy(policy.id)}
                        className="action-btn edit"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(policy.id)}
                        className="action-btn delete"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
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
              <div style={{ padding: '16px', background: '#fee', borderRadius: '8px', border: '1px solid #fcc', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                      This will cancel the commission and policy
                    </div>
                    <div style={{ fontSize: '14px', color: '#991b1b', lineHeight: '1.5' }}>
                      Chargeback amount will be calculated automatically: <strong>Advance - Earned</strong>
                    </div>
                  </div>
                </div>
              </div>
              {selectedCommission && (
                <div style={{ padding: '12px', background: '#f8f9fa', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '4px' }}>Advance Amount</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                        {formatCurrency(selectedCommission.amount || 0)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '4px' }}>Current Status</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', textTransform: 'capitalize' }}>
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
                className="btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }}
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
