// src/features/policies/PolicyDashboard.tsx

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyForm } from "./PolicyForm";
import { PolicyList } from "./PolicyList";
import { PolicyDashboardHeader } from "./components/PolicyDashboardHeader";
import { usePolicies } from "../../hooks/policies";
import { useCarriers } from "../../hooks/carriers";
import { usePolicyMutations } from "./hooks/usePolicyMutations";
import { usePolicySummary } from "./hooks/usePolicySummary";
import { PolicyFilters } from "../../types/policy.types";

export const PolicyDashboard: React.FC = () => {
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>();

  const { data: policies = [], isLoading, error, refetch } = usePolicies();
  useCarriers();

  // Use custom hooks for mutations and summary calculations
  const { addPolicy, updatePolicy, updatePolicyStatus, deletePolicy } = usePolicyMutations(refetch);
  const summary = usePolicySummary(policies);

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

  const handleEditPolicy = (policyId: string) => {
    setEditingPolicyId(policyId);
    setIsPolicyFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsPolicyFormOpen(false);
    setEditingPolicyId(undefined);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20 text-gray-600">Loading policies...</div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-destructive/20 via-error/10 to-card rounded-lg shadow-md">
        <AlertCircle size={20} className="text-destructive" />
        <span className="text-destructive font-medium">Error loading policies: {(error as Error).message}</span>
        <Button onClick={() => refetch()} variant="outline" size="sm" className="ml-auto">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-[1400px] mx-auto">
      <PolicyDashboardHeader
        summary={summary}
        onNewPolicy={() => setIsPolicyFormOpen(true)}
      />

      {/* Alerts Bar */}
      {summary.expiringPolicies.length > 0 && (
        <div className="flex items-center gap-2 p-2 px-3 bg-gradient-to-r from-warning/20 via-status-pending/10 to-card rounded-md shadow-md mb-4">
          <AlertCircle size={16} className="text-warning" />
          <span className="text-[13px] text-warning font-medium">
            {summary.expiringPolicies.length} policies expiring in next 30 days
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]" onClick={handleCloseForm}>
          <div className="bg-gradient-to-br from-card to-muted/10 rounded-xl shadow-2xl w-[90%] max-w-[900px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 px-6 bg-gradient-to-r from-muted/30 to-card shadow-sm">
              <h2 className="text-lg font-semibold text-foreground m-0">
                {editingPolicyId ? "Edit Policy" : "New Policy Submission"}
              </h2>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCloseForm}>
                ×
              </Button>
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
