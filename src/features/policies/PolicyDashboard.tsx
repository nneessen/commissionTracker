// src/features/policies/PolicyDashboard.tsx

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyDialog } from "./components/PolicyDialog";
import { PolicyList } from "./PolicyList";
import {
  usePolicies,
  useCreatePolicy,
  useUpdatePolicy,
  usePolicy,
} from "../../hooks/policies";
import { useCarriers } from "../../hooks/carriers";
import { useAuth } from "../../contexts/AuthContext";
import { clientService } from "@/services/clients";
import {
  transformFormToCreateData,
  transformFormToUpdateData,
} from "./utils/policyFormTransformer";
import type { NewPolicyForm } from "../../types/policy.types";
import { toast } from "sonner";

export const PolicyDashboard: React.FC = () => {
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>();

  const { user } = useAuth();
  const { isLoading, error, refetch } = usePolicies();
  // Fetch the specific policy being edited - this is the reliable data source
  const { data: editingPolicy, isLoading: isEditingPolicyLoading } =
    usePolicy(editingPolicyId);
  useCarriers();

  // Use CRUD mutation hooks
  const createPolicyMutation = useCreatePolicy();
  const updatePolicyMutation = useUpdatePolicy();

  const handleEditPolicy = (policyId: string) => {
    setEditingPolicyId(policyId);
    setIsPolicyFormOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-20 text-zinc-500 dark:text-zinc-400">
        Loading policies...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 p-4 bg-red-500/10 rounded-lg border border-red-200 dark:border-red-800">
        <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
        <span className="text-red-600 dark:text-red-400 font-medium">
          Error loading policies: {(error as Error).message}
        </span>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="ml-auto"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
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
            toast.error("You must be logged in");
            return null;
          }

          try {
            // Create or find the client
            const clientResult = await clientService.createOrFind(
              {
                name: formData.clientName,
                email: formData.clientEmail || undefined,
                phone: formData.clientPhone || undefined,
                address: JSON.stringify({
                  state: formData.clientState,
                  age: formData.clientAge,
                }),
              },
              user.id,
            );

            if (!clientResult.success || !clientResult.data) {
              throw (
                clientResult.error || new Error("Failed to create/find client")
              );
            }
            const client = clientResult.data;

            if (editingPolicyId) {
              // Update existing policy
              const updateData = transformFormToUpdateData(formData, client.id);
              await updatePolicyMutation.mutateAsync({
                id: editingPolicyId,
                updates: updateData,
              });
              toast.success("Policy updated successfully");
              return null;
            } else {
              // Create new policy
              const createData = transformFormToCreateData(
                formData,
                client.id,
                user.id,
              );
              const result = await createPolicyMutation.mutateAsync(createData);
              toast.success(
                `Policy ${result.policyNumber} created successfully!`,
              );
              return result;
            }
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Operation failed";
            toast.error(message);
            throw error;
          }
        }}
        policyId={editingPolicyId}
        policy={editingPolicy}
        isLoadingPolicy={isEditingPolicyLoading}
      />
    </div>
  );
};
