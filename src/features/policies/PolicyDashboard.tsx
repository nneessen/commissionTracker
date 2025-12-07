// src/features/policies/PolicyDashboard.tsx

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyDialog } from "./components/PolicyDialog";
import { PolicyList } from "./PolicyList";
import { usePolicies, useCreatePolicy, useUpdatePolicy, usePolicy } from "../../hooks/policies";
import { useCarriers } from "../../hooks/carriers";
import { useAuth } from "../../contexts/AuthContext";
import { clientService } from "../../services/clients/clientService";
import { transformFormToCreateData, transformFormToUpdateData } from "./utils/policyFormTransformer";
import type { NewPolicyForm } from "../../types/policy.types";
import showToast from "../../utils/toast";

export const PolicyDashboard: React.FC = () => {
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>();

  const { user } = useAuth();
  const { data: policies = [], isLoading, error, refetch } = usePolicies();
  const { data: editingPolicy } = usePolicy(editingPolicyId);
  useCarriers();

  // Use CRUD mutation hooks
  const createPolicyMutation = useCreatePolicy();
  const updatePolicyMutation = useUpdatePolicy();

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
        onSave={async (formData: NewPolicyForm) => {
          if (!user?.id) {
            showToast.error('You must be logged in');
            return null;
          }

          try {
            // Create or find the client
            const client = await clientService.createOrFind({
              name: formData.clientName,
              email: formData.clientEmail || undefined,
              phone: formData.clientPhone || undefined,
              address: JSON.stringify({
                state: formData.clientState,
                age: formData.clientAge,
              }),
            }, user.id);

            if (editingPolicyId) {
              // Update existing policy
              const updateData = transformFormToUpdateData(formData, client.id);
              await updatePolicyMutation.mutateAsync({ id: editingPolicyId, updates: updateData });
              showToast.success('Policy updated successfully');
              return null;
            } else {
              // Create new policy
              const createData = transformFormToCreateData(formData, client.id, user.id);
              const result = await createPolicyMutation.mutateAsync(createData);
              showToast.success(`Policy ${result.policyNumber} created successfully!`);
              return result;
            }
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Operation failed';
            showToast.error(message);
            throw error;
          }
        }}
        policyId={editingPolicyId}
        getPolicyById={getPolicyById}
      />
    </div>
  );
};
