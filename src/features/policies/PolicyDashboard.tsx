// src/features/policies/PolicyDashboard.tsx

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyDialog } from "./components/PolicyDialog";
import { PolicyList } from "./PolicyList";
import { PolicyDashboardHeader } from "./components/PolicyDashboardHeader";
import { usePolicies } from "../../hooks/policies";
import { useCarriers } from "../../hooks/carriers";
import { useCommissions } from "../../hooks/commissions/useCommissions";
import { usePolicyMutations } from "./hooks/usePolicyMutations";
import { usePolicySummary } from "./hooks/usePolicySummary";
import { PolicyFilters } from "../../types/policy.types";

export const PolicyDashboard: React.FC = () => {
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>();

  const { data: policies = [], isLoading, error, refetch } = usePolicies();
  useCarriers();

  // Import commission data to calculate actual commission metrics
  const { data: commissions = [] } = useCommissions();

  // Use custom hooks for mutations and summary calculations
  const { addPolicy, updatePolicy, updatePolicyStatus, deletePolicy } = usePolicyMutations(refetch);
  const summary = usePolicySummary(policies, commissions);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20 text-muted-foreground">Loading policies...</div>
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

      {/* Policy Dialog */}
      <PolicyDialog
        open={isPolicyFormOpen}
        onOpenChange={(open) => {
          setIsPolicyFormOpen(open);
          if (!open) {
            setEditingPolicyId(undefined);
          }
        }}
        onSave={async (formData) => {
          if (editingPolicyId) {
            const result = await updatePolicy(editingPolicyId, formData);
            return result || null;
          } else {
            const result = await addPolicy(formData);
            return result || null;
          }
        }}
        policyId={editingPolicyId}
        getPolicyById={getPolicyById}
      />
    </div>
  );
};
