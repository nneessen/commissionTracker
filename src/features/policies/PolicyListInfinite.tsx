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
import { Button } from "@/components/ui/button";
import { useCarriers } from "../../hooks/carriers";
import { useInfinitePolicies, usePolicyCount } from "../../hooks/policies/useInfinitePolicies";
import { Policy, PolicyFilters, PolicyStatus } from "../../types/policy.types";
import { ProductType } from "../../types/commission.types";
import { calculateCommissionAdvance } from "../../utils/policyCalculations";
import { formatCurrency, formatDate } from "../../lib/format";

interface PolicyListInfiniteProps {
  onEditPolicy: (policyId: string) => void;
  onDeletePolicy: (policyId: string) => void;
  updatePolicyStatus: (id: string, status: PolicyStatus) => void;
}

const STATUS_BADGE_CLASSES: Record<PolicyStatus, string> = {
  pending: "text-yellow-700 bg-yellow-50 ring-1 ring-inset ring-yellow-600/20 dark:text-yellow-400 dark:bg-yellow-950/50 dark:ring-yellow-800/40",
  active: "text-green-700 bg-green-50 ring-1 ring-inset ring-green-600/20 dark:text-green-400 dark:bg-green-950/50 dark:ring-green-800/40",
  lapsed: "text-orange-700 bg-orange-50 ring-1 ring-inset ring-orange-600/20 dark:text-orange-400 dark:bg-orange-950/50 dark:ring-orange-800/40",
  cancelled: "text-red-700 bg-red-50 ring-1 ring-inset ring-red-600/20 dark:text-red-400 dark:bg-red-950/50 dark:ring-red-800/40",
  matured: "text-zinc-700 bg-zinc-50 ring-1 ring-inset ring-zinc-600/20 dark:text-zinc-400 dark:bg-zinc-800/50 dark:ring-zinc-700/40",
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
          <Button onClick={() => refetch()} size="sm">
            Retry
          </Button>
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
          <Button
            variant="outline"
            size="sm"
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
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
      <div className="w-full overflow-x-auto bg-card rounded-lg shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-muted/30">
            <tr>
              <th className="py-3 px-4 text-left font-semibold" style={{color: '#f5f5f5'}}>Policy</th>
              <th className="py-3 px-4 text-left font-semibold" style={{color: '#f5f5f5'}}>Client</th>
              <th className="py-3 px-4 text-left font-semibold" style={{color: '#f5f5f5'}}>Carrier/Product</th>
              <th className="py-3 px-4 text-left font-semibold" style={{color: '#f5f5f5'}}>Status</th>
              <th className="py-3 px-4 text-right font-semibold" style={{color: '#f5f5f5'}}>Premium</th>
              <th className="py-3 px-4 text-right font-semibold" style={{color: '#f5f5f5'}}>Commission</th>
              <th className="py-3 px-4 text-left font-semibold" style={{color: '#f5f5f5'}}>Effective</th>
              <th className="py-3 px-4 text-center font-semibold" style={{color: '#f5f5f5'}}>Actions</th>
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
                  <tr key={policy.id} className="hover:bg-muted/30 transition-colors border-b border-border/50">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium" style={{color: '#f5f5f5'}}>{policy.policyNumber}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium" style={{color: '#f5f5f5'}}>{policy.client.name}</span>
                        <span className="text-xs" style={{color: '#d4d4d8'}}>
                          {policy.client.age}y • {policy.client.state}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium" style={{color: '#f5f5f5'}}>
                          {carrier?.name || "Unknown"}
                        </span>
                        <span className="text-xs" style={{color: '#d4d4d8'}} title={productName}>
                          {productName}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${STATUS_BADGE_CLASSES[policy.status]}`}>
                        {policy.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col gap-0.5 items-end">
                        <span className="text-sm font-medium" style={{color: '#f5f5f5'}}>{formatCurrency(policy.annualPremium)}</span>
                        <span className="text-xs" style={{color: '#d4d4d8'}}>
                          {policy.paymentFrequency}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex flex-col gap-0.5 items-end">
                        <span className="text-sm font-medium" style={{color: '#f5f5f5'}}>{formatCurrency(commission)}</span>
                        <span className="text-xs" style={{color: '#d4d4d8'}}>
                          {(policy.commissionPercentage * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm" style={{color: '#f5f5f5'}}>{formatDate(policy.effectiveDate)}</td>
                    <td className="py-3 px-4">
                      <Button
                        onClick={() => onEditPolicy(policy.id)}
                        variant="ghost"
                        size="icon"
                        className="action-btn edit h-8 w-8"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </Button>
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
                      <Button
                        onClick={() => handleDelete(policy.id)}
                        variant="ghost"
                        size="icon"
                        className="action-btn delete h-8 w-8"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </Button>
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