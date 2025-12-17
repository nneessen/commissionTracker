// src/features/policies/components/PolicyDialog.tsx

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PolicyForm } from "../PolicyForm";
import type { NewPolicyForm, Policy } from "../../../types/policy.types";

interface PolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (formData: NewPolicyForm) => Promise<Policy | null>;
  policyId?: string;
  policy?: Policy | null;
  isLoadingPolicy?: boolean;
}

/**
 * PolicyDialog - Wraps PolicyForm in a shadcn/ui Dialog component
 * Matches the styling pattern of ExpenseDialog for consistency
 */
export function PolicyDialog({
  open,
  onOpenChange,
  onSave,
  policyId,
  policy,
  isLoadingPolicy = false,
}: PolicyDialogProps) {
  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <DialogHeader className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <DialogTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {policyId ? "Edit Policy" : "New Policy"}
          </DialogTitle>
          <DialogDescription className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            {policyId
              ? "Update the policy details below"
              : "Fill in the details to add a new policy"}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1">
          {isLoadingPolicy && policyId ? (
            <div className="flex items-center justify-center p-8 text-zinc-500 dark:text-zinc-400 text-[11px]">
              Loading policy data...
            </div>
          ) : (
            <PolicyForm
              policyId={policyId}
              policy={policy}
              onClose={handleClose}
              addPolicy={onSave}
              updatePolicy={async (
                _id: string,
                updates: Partial<NewPolicyForm>,
              ) => {
                // For updates, pass the formData through onSave which handles both create and update
                await onSave(updates as NewPolicyForm);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
