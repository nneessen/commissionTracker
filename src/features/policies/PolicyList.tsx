// /home/nneessen/projects/commissionTracker/src/features/policies/PolicyList.tsx

import React, { useState, useMemo } from "react";
import {
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { useCarriers } from "../../hooks/useCarriers";
import { Policy, PolicyFilters, PolicyStatus } from "../../types/policy.types";
import { ProductType } from "../../types/commission.types";

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
  const { getCarrierById } = useCarriers();

  const [filters, setFilters] = useState<PolicyFilters>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("effectiveDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [showFilters, setShowFilters] = useState(false);

  const filteredAndSortedPolicies = useMemo(() => {
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
          aVal = a.annualPremium * (a.commissionPercentage / 100);
          bVal = b.annualPremium * (b.commissionPercentage / 100);
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
  }, [
    filters,
    searchTerm,
    sortField,
    sortDirection,
    filterPolicies,
    getCarrierById,
  ]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleStatusChange = (policyId: string, newStatus: PolicyStatus) => {
    updatePolicyStatus(policyId, newStatus);
  };

  const handleDeletePolicy = (policyId: string) => {
    if (window.confirm("Are you sure you want to delete this policy?")) {
      deletePolicy(policyId);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    return dateObj.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
              <SortHeader field="effectiveDate">Effective</SortHeader>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedPolicies.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-message">
                  No policies found. Submit a policy to get started.
                </td>
              </tr>
            ) : (
              filteredAndSortedPolicies.map((policy) => {
                const carrier = getCarrierById(policy.carrierId);
                const commission =
                  policy.annualPremium * (policy.commissionPercentage / 100);

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
                          {policy.commissionPercentage}%
                        </span>
                      </div>
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
                      <select
                        value={policy.status}
                        onChange={(e) =>
                          handleStatusChange(
                            policy.id,
                            e.target.value as PolicyStatus,
                          )
                        }
                        className="status-select"
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="lapsed">Lapsed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="matured">Matured</option>
                      </select>
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
    </div>
  );
};

