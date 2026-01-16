// src/features/policies/PolicyDashboard.tsx

import React, { useState, useRef, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PolicyDialog } from "./components/PolicyDialog";
import { FirstSellerNamingDialog } from "./components/FirstSellerNamingDialog";
import { LeadSourceDialog } from "./components/LeadSourceDialog";
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

// Type for pending first-sale logs
interface PendingFirstSaleLog {
  logId: string;
  agencyName: string;
}

// Type for pending lead source attribution
interface PendingLeadSource {
  policyId: string;
  policyNumber: string | null;
}

// Polling configuration for first-seller check
const FIRST_SELLER_POLL_MAX_ATTEMPTS = 6;
const FIRST_SELLER_POLL_INTERVAL_MS = 500;

export const PolicyDashboard: React.FC = () => {
  const [isPolicyFormOpen, setIsPolicyFormOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | undefined>();
  // Support multiple pending logs for multi-channel naming
  const [pendingFirstSales, setPendingFirstSales] = useState<
    PendingFirstSaleLog[]
  >([]);
  const [currentFirstSaleIndex, setCurrentFirstSaleIndex] = useState(0);
  // Lead source attribution dialog state
  const [pendingLeadSource, setPendingLeadSource] =
    useState<PendingLeadSource | null>(null);

  // Ref to track active polling and allow cancellation
  const pollingAbortRef = useRef<AbortController | null>(null);

  const { user } = useAuth();

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingAbortRef.current) {
        pollingAbortRef.current.abort();
      }
    };
  }, []);

  // Get the current first sale dialog to show (if any)
  const currentFirstSale = pendingFirstSales[currentFirstSaleIndex];

  // Handle when a naming dialog is completed (move to next or close)
  const handleFirstSaleComplete = () => {
    if (currentFirstSaleIndex < pendingFirstSales.length - 1) {
      // Move to next pending log
      setCurrentFirstSaleIndex((prev) => prev + 1);
    } else {
      // All done, close dialogs
      setPendingFirstSales([]);
      setCurrentFirstSaleIndex(0);
    }
  };

  const checkFirstSeller = async (userId: string) => {
    // Cancel any existing polling before starting new one
    if (pollingAbortRef.current) {
      pollingAbortRef.current.abort();
    }

    const abortController = new AbortController();
    pollingAbortRef.current = abortController;

    // The edge function triggered by the DB runs asynchronously and takes ~1-2 seconds.
    // We poll multiple times to catch the first-sale pending state when it's created.
    for (let attempt = 0; attempt < FIRST_SELLER_POLL_MAX_ATTEMPTS; attempt++) {
      // Check if polling was cancelled
      if (abortController.signal.aborted) {
        return;
      }

      try {
        const { data, error } = await supabase.rpc(
          "check_first_seller_naming",
          {
            p_user_id: userId,
          },
        );

        if (abortController.signal.aborted) {
          return;
        }

        if (error) {
          console.error("Error checking first seller:", error);
          return;
        }

        // RPC now returns ALL pending logs for multi-channel naming
        if (data && data.length > 0) {
          const pendingLogs = data
            .filter((log: { needs_naming: boolean }) => log.needs_naming)
            .map((log: { log_id: string; agency_name: string }) => ({
              logId: log.log_id,
              agencyName: log.agency_name,
            }));

          if (pendingLogs.length > 0) {
            setPendingFirstSales(pendingLogs);
            setCurrentFirstSaleIndex(0);
            return; // Found pending logs, stop polling
          }
        }

        // If no data yet and we haven't exhausted attempts, wait and try again
        if (attempt < FIRST_SELLER_POLL_MAX_ATTEMPTS - 1) {
          await new Promise((resolve) =>
            setTimeout(resolve, FIRST_SELLER_POLL_INTERVAL_MS),
          );
        }
      } catch (err) {
        if (abortController.signal.aborted) {
          return;
        }
        console.error("Error checking first seller:", err);
        return;
      }
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

      {/* Lead Source Dialog - shown after policy creation, before FirstSellerNamingDialog */}
      {/* Only show if no first sale dialog is pending (prevents dialog overlap) */}
      {pendingLeadSource && !currentFirstSale && (
        <LeadSourceDialog
          open={true}
          onOpenChange={() => {
            // Not used - LeadSourceDialog calls onComplete directly
          }}
          policyId={pendingLeadSource.policyId}
          policyNumber={pendingLeadSource.policyNumber}
          onComplete={() => {
            // Lead source recorded or skipped - proceed to first seller check
            // Only check if no first sale dialogs are already pending
            setPendingLeadSource(null);
            if (user?.id && pendingFirstSales.length === 0) {
              checkFirstSeller(user.id);
            }
          }}
        />
      )}

      {/* First Seller Naming Dialog(s) - supports multi-channel naming */}
      {currentFirstSale && (
        <FirstSellerNamingDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              handleFirstSaleComplete();
            }
          }}
          logId={currentFirstSale.logId}
          agencyName={currentFirstSale.agencyName}
          totalChannels={pendingFirstSales.length}
          currentChannel={currentFirstSaleIndex + 1}
        />
      )}

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
            // Create or find the client with real DOB
            const clientResult = await clientService.createOrFind(
              {
                name: formData.clientName,
                email: formData.clientEmail || undefined,
                phone: formData.clientPhone || undefined,
                address: JSON.stringify({
                  state: formData.clientState,
                }),
                date_of_birth: formData.clientDOB,
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

              // Show lead source dialog BEFORE checking first seller
              // The dialog's onComplete will trigger checkFirstSeller
              setPendingLeadSource({
                policyId: result.id,
                policyNumber: result.policyNumber,
              });

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
