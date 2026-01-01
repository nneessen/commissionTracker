// src/features/policies/PolicyDashboard.tsx

import React, { useState } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyDialog } from "./components/PolicyDialog";
import { FirstSellerNamingDialog } from "./components/FirstSellerNamingDialog";
import { LogoSpinner } from "@/components/ui/logo-spinner";
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
import { supabase } from "@/services/base/supabase";
import {
  transformFormToCreateData,
  transformFormToUpdateData,
} from "./utils/policyFormTransformer";
import type { NewPolicyForm } from "../../types/policy.types";
import { toast } from "sonner";

export const PolicyDashboard: React.FC = () => {
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>();
  const [firstSellerDialog, setFirstSellerDialog] = useState<{
    open: boolean;
    logId: string;
    agencyName: string;
  }>({ open: false, logId: "", agencyName: "" });

  const { user } = useAuth();

  const checkFirstSeller = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc("check_first_seller_naming", {
        p_user_id: userId,
      });

      if (error) {
        console.error("Error checking first seller:", error);
        return;
      }

      if (data && data.length > 0 && data[0].needs_naming) {
        setFirstSellerDialog({
          open: true,
          logId: data[0].log_id,
          agencyName: data[0].agency_name,
        });
      }
    } catch (err) {
      console.error("Error checking first seller:", err);
    }
  };

  const { isLoading, error, refetch } = usePolicies();
  const { data: editingPolicy, isLoading: isEditingPolicyLoading } =
    usePolicy(editingPolicyId);
  useCarriers();

  const createPolicyMutation = useCreatePolicy();
  const updatePolicyMutation = useUpdatePolicy();

  const handleEditPolicy = (policyId: string) => {
    setEditingPolicyId(policyId);
    setIsPolicyFormOpen(true);
  };

  if (isLoading) {
    return (
      <>
        <LogoSpinner size="sm" className="mr-2" />
        Loading policies...
      </>
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

      {/* First Seller Naming Dialog */}
      <FirstSellerNamingDialog
        open={firstSellerDialog.open}
        onOpenChange={(open) =>
          setFirstSellerDialog((prev) => ({ ...prev, open }))
        }
        logId={firstSellerDialog.logId}
        agencyName={firstSellerDialog.agencyName}
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

              // Check if user is first seller immediately
              // The edge function now stores pending data for first sales instead of posting
              checkFirstSeller(user.id);

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
