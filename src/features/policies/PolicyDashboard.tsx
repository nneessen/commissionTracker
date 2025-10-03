import React, { useState, useMemo } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { PolicyForm } from "./PolicyForm";
import { PolicyList } from "./PolicyList";
import {
  usePoliciesList,
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
} from "../../hooks/policies";
import { useCarriers } from "../../hooks/useCarriers";
import {
  PolicyStatus,
  PolicyFilters,
  CreatePolicyData,
} from "../../types/policy.types";
import "../../styles/policy.css";

export const PolicyDashboard: React.FC = () => {
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>();

  const { data: policies = [], isLoading, error, refetch } = usePoliciesList();

  const createPolicyMutation = useCreatePolicy();
  const updatePolicyMutation = useUpdatePolicy();
  const deletePolicyMutation = useDeletePolicy();

  useCarriers();

  // Adapter functions to match old interface that PolicyList/PolicyForm expect
  const addPolicy = (formData: any) => {
    // Convert form data to CreatePolicyData format
    const policyData: CreatePolicyData = {
      policyNumber: formData.policyNumber,
      status: formData.status,
      client: {
        name: formData.clientName,
        state: formData.clientState,
        age: formData.clientAge,
        email: formData.clientEmail,
        phone: formData.clientPhone,
      },
      carrierId: formData.carrierId,
      product: formData.product,
      effectiveDate: new Date(formData.effectiveDate),
      termLength: formData.termLength,
      expirationDate: formData.expirationDate
        ? new Date(formData.expirationDate)
        : undefined,
      annualPremium: formData.annualPremium || 0,
      paymentFrequency: formData.paymentFrequency,
      commissionPercentage: formData.commissionPercentage,
      notes: formData.notes,
    };

    createPolicyMutation.mutate(policyData, {
      onSuccess: () => {
        refetch();
      },
    });

    // Return a mock policy for backwards compatibility
    return { id: "temp", ...policyData } as any;
  };

  const updatePolicy = (id: string, updates: any) => {
    // If updates has clientName, convert to proper format
    let policyData: Partial<CreatePolicyData>;

    if ("clientName" in updates) {
      policyData = {
        policyNumber: updates.policyNumber,
        status: updates.status,
        client: {
          name: updates.clientName,
          state: updates.clientState,
          age: updates.clientAge,
          email: updates.clientEmail,
          phone: updates.clientPhone,
        },
        carrierId: updates.carrierId,
        product: updates.product,
        effectiveDate: new Date(updates.effectiveDate),
        termLength: updates.termLength,
        expirationDate: updates.expirationDate
          ? new Date(updates.expirationDate)
          : undefined,
        annualPremium: updates.annualPremium || 0,
        paymentFrequency: updates.paymentFrequency,
        commissionPercentage: updates.commissionPercentage,
        notes: updates.notes,
      };
    } else {
      policyData = updates;
    }

    updatePolicyMutation.mutate(
      { id, updates: policyData },
      {
        onSuccess: () => {
          refetch();
        },
      },
    );
  };

  const updatePolicyStatus = (id: string, status: PolicyStatus) => {
    updatePolicyMutation.mutate(
      { id, updates: { status } as any },
      {
        onSuccess: () => {
          refetch();
        },
      },
    );
  };

  const deletePolicy = (id: string) => {
    deletePolicyMutation.mutate(id, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  const getPolicyById = (id: string) => {
    return policies.find((p) => p.id === id);
  };

  const filterPolicies = (filters: PolicyFilters) => {
    return policies.filter((policy) => {
      if (filters.status && policy.status !== filters.status) return false;
      if (filters.carrierId && policy.carrierId !== filters.carrierId)
        return false;
      if (filters.product && policy.product !== filters.product) return false;
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        return (
          policy.client.name.toLowerCase().includes(searchLower) ||
          policy.policyNumber.toLowerCase().includes(searchLower) ||
          policy.client.state.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  };

  // Calculate summary stats from loaded policies
  const summary = useMemo(() => {
    const activePolicies = policies.filter((p) => p.status === "active");
    const totalAnnualPremium = policies.reduce(
      (sum, p) => sum + (p.annualPremium || 0),
      0,
    );
    const totalExpectedCommission = policies.reduce(
      (sum, p) =>
        sum + ((p.annualPremium || 0) * (p.commissionPercentage || 0)) / 100,
      0,
    );

    return {
      totalPolicies: policies.length,
      activePolicies: activePolicies.length,
      totalAnnualPremium,
      totalExpectedCommission,
    };
  }, [policies]);

  // Get expiring policies (within 30 days)
  const expiringPolicies = useMemo(() => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const now = new Date();

    return policies.filter((policy) => {
      if (!policy.expirationDate) return false;
      const expDate = new Date(policy.expirationDate).getTime();
      return expDate >= now.getTime() && expDate <= futureDate.getTime();
    });
  }, [policies]);

  const handleEditPolicy = (policyId: string) => {
    setEditingPolicyId(policyId);
    setIsPolicyFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsPolicyFormOpen(false);
    setEditingPolicyId(undefined);
  };

  const averageCommissionRate =
    summary.totalAnnualPremium > 0
      ? (summary.totalExpectedCommission / summary.totalAnnualPremium) * 100
      : 0;

  if (isLoading) {
    return (
      <div className="policy-dashboard">
        <div className="loading-spinner">Loading policies...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="policy-dashboard">
        <div className="error-message">
          <AlertCircle size={20} />
          <span>Error loading policies: {(error as Error).message}</span>
          <button onClick={() => refetch()} className="btn-secondary">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="policy-dashboard">
      {/* Compact Header with Stats */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1>Policy Management</h1>
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-value">{summary.totalPolicies}</span>
              <span className="stat-label">Policies</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{summary.activePolicies}</span>
              <span className="stat-label">Active</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                ${(summary.totalAnnualPremium / 1000).toFixed(1)}K
              </span>
              <span className="stat-label">Premium</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                ${(summary.totalExpectedCommission / 1000).toFixed(1)}K
              </span>
              <span className="stat-label">Commission</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {averageCommissionRate.toFixed(1)}%
              </span>
              <span className="stat-label">Avg Rate</span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button
            onClick={() => setIsPolicyFormOpen(true)}
            className="btn-primary"
          >
            <Plus size={16} />
            New Policy
          </button>
        </div>
      </div>

      {/* Alerts Bar */}
      {expiringPolicies.length > 0 && (
        <div className="alert-bar">
          <AlertCircle size={16} />
          <span>
            {expiringPolicies.length} policies expiring in next 30 days
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div className="dashboard-content">
        {/* Policy List with Actions - Passing adapter functions that maintain old interface */}
        <PolicyList
          policies={policies}
          deletePolicy={deletePolicy}
          updatePolicyStatus={updatePolicyStatus}
          filterPolicies={filterPolicies}
          onEditPolicy={handleEditPolicy}
        />
      </div>

      {/* Modal Dialog */}
      {isPolicyFormOpen && (
        <div className="modal-overlay" onClick={handleCloseForm}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {editingPolicyId ? "Edit Policy" : "New Policy Submission"}
              </h2>
              <button className="modal-close" onClick={handleCloseForm}>
                ×
              </button>
            </div>
            <PolicyForm
              policyId={editingPolicyId}
              onClose={handleCloseForm}
              addPolicy={addPolicy}
              updatePolicy={updatePolicy}
              getPolicyById={getPolicyById}
            />
          </div>
        </div>
      )}
    </div>
  );
};
