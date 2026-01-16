// src/features/policies/components/PolicyDialog.tsx

import React from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, X } from "lucide-react";
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
 * Matches the styling pattern of ManageLeadPurchaseDialog for consistency
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
      <DialogContent
        className="p-0 gap-0 overflow-hidden bg-background border-0 shadow-2xl ring-0 outline-none max-w-3xl"
        hideCloseButton
      >
        <DialogTitle className="sr-only">
          {policyId ? "Edit Policy" : "New Policy"}
        </DialogTitle>

        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold">
                {policyId ? "Edit Policy" : "New Policy"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Content */}
          {isLoadingPolicy && policyId ? (
            <div className="flex items-center justify-center p-8 text-muted-foreground text-[11px]">
              Loading policy data...
            </div>
          ) : (
            <PolicyForm
              // CRITICAL: key prop forces remount when policyId changes
              // This ensures fresh useState initialization for each policy
              key={policyId || "new"}
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
