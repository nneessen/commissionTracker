// src/features/policies/PolicyDashboard.tsx

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyDialog } from "./components/PolicyDialog";
import { PolicyList } from "./PolicyList";
import { usePolicies } from "../../hooks/policies";
import { useCarriers } from "../../hooks/carriers";
import { usePolicyMutations } from "./hooks/usePolicyMutations";
import { PolicyFilters } from "../../types/policy.types";

export const PolicyDashboard: React.FC = () => {
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>();

  const { data: policies = [], isLoading, error, refetch } = usePolicies();
  useCarriers();

  // Use custom hooks for mutations
  const { addPolicy, updatePolicy } = usePolicyMutations(refetch);

  const getPolicyById = (id: string) => {
    return policies.find((p) => p.id === id);
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
    <div className="h-screen flex flex-col">
      <PolicyList
        onEditPolicy={handleEditPolicy}
        onNewPolicy={() => setIsPolicyFormOpen(true)}
      />

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
            await updatePolicy(editingPolicyId, formData);
            return null;
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
