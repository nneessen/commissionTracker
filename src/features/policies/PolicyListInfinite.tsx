// PolicyListInfinite.tsx - Version with infinite scrolling for large datasets
import React, { useState, useRef, useEffect } from "react";
import {
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronUp,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useCarriers } from "../../hooks/carriers";
import { useInfinitePolicies, usePolicyCount } from "../../hooks/policies/useInfinitePolicies";
import { Policy, PolicyFilters, PolicyStatus } from "../../types/policy.types";
import { ProductType } from "../../types/commission.types";
import { calculateCommissionAdvance } from "../../utils/policyCalculations";

interface PolicyListInfiniteProps {
  onEditPolicy: (policyId: string) => void;
  onDeletePolicy: (policyId: string) => void;
  updatePolicyStatus: (id: string, status: PolicyStatus) => void;
}

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
  variable_life: "VUL",
  health: "Health",
  disability: "Disability",
  annuity: "Ann",
  other: "Other",
};

export const PolicyListInfinite: React.FC<PolicyListInfiniteProps> = ({
  onEditPolicy,
  onDeletePolicy,
  updatePolicyStatus,
}) => {
  const { data: carriers = [] } = useCarriers();
  const getCarrierById = (id: string) => carriers.find(c => c.id === id);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Filters state
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    carrierId: undefined as string | undefined,
    productId: undefined as string | undefined,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Use infinite policies hook
  const {
    policies,
    isLoading,
    isError,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    totalFetched,
  } = useInfinitePolicies({
    filters,
    limit: 50, // Fetch 50 at a time
    orderBy: 'created_at',
    orderDirection: 'desc'
  });

  // Get total count separately
  const { data: count = 0 } = usePolicyCount(filters);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Filter policies client-side by search term
  const displayPolicies = searchTerm
    ? policies.filter(p =>
        p.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.client.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : policies;

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: 'numeric',
    });
  };

  const handleStatusChange = (policyId: string, newStatus: PolicyStatus) => {
    updatePolicyStatus(policyId, newStatus);
    refetch(); // Refetch to get updated data
  };

  const handleDelete = (policyId: string) => {
    if (window.confirm("Are you sure you want to delete this policy?")) {
      onDeletePolicy(policyId);
      refetch(); // Refetch to get updated data
    }
  };

  if (isLoading && totalFetched === 0) {
    return (
      <div className="policy-list">
        <div className="loading-container">
          <Loader2 className="animate-spin" size={32} />
          <span>Loading policies...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="policy-list">
        <div className="error-container">
          <p>Error loading policies: {error?.message}</p>
          <button onClick={() => refetch()} className="btn btn-primary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="policy-list">
      {/* Search and Filter Header */}
      <div className="list-header">
        <div className="search-bar">
          <Search size={20} />
          <input
            type="text"
            placeholder="Search policies by number or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="header-actions">
          <button
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <div className="policy-count">
            {totalFetched} of {count || '...'} policies loaded
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="filter-panel">
          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status || ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  status: e.target.value || undefined,
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
              <option value="">All Carriers</option>
              {carriers?.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Policy Table */}
      <div className="policy-table-container">
        <table className="policy-table">
          <thead>
            <tr>
              <th>Policy</th>
              <th>Client</th>
              <th>Carrier/Product</th>
              <th>Status</th>
              <th>Premium</th>
              <th>Commission</th>
              <th>Effective</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayPolicies.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty-message">
                  No policies found. Submit a policy to get started.
                </td>
              </tr>
            ) : (
              displayPolicies.map((policy) => {
                const carrier = getCarrierById(policy.carrierId);
                // Calculate commission advance: Monthly Premium × Advance Months × Commission Rate
                // Note: Using default 9 months advance - actual advances are tracked in commissions table
                const commission = calculateCommissionAdvance(
                  policy.annualPremium,
                  policy.commissionPercentage,
                  9 // Default advance months
                );
                const productName = policy.productDetails?.name || PRODUCT_ABBREV[policy.product];

                return (
                  <tr key={policy.id}>
                    <td className="policy-number">{policy.policyNumber}</td>
                    <td>
                      <div className="client-info">
                        <span className="client-name">{policy.client.name}</span>
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
                        <span className="product-type" title={productName}>
                          {productName}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${STATUS_BADGES[policy.status]}`}>
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
                          handleStatusChange(policy.id, e.target.value as PolicyStatus)
                        }
                        className="status-select"
                        title="Change Status"
                      >
                        <option value="pending">Pending</option>
                        <option value="active">Active</option>
                        <option value="lapsed">Lapsed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="matured">Matured</option>
                      </select>
                      <button
                        onClick={() => handleDelete(policy.id)}
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

        {/* Load More Trigger */}
        <div ref={loadMoreRef} className="load-more-trigger">
          {isFetchingNextPage && (
            <div className="loading-more">
              <Loader2 className="animate-spin" size={24} />
              <span>Loading more policies...</span>
            </div>
          )}
          {!hasNextPage && totalFetched > 0 && (
            <div className="end-of-list">All policies loaded ({totalFetched} total)</div>
          )}
        </div>
      </div>
    </div>
  );
};