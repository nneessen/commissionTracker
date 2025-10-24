// src/features/policies/components/PolicyDialog.tsx

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PolicyForm } from '../PolicyForm';
import type { NewPolicyForm, Policy } from '../../../types/policy.types';

interface PolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (formData: NewPolicyForm) => Promise<Policy | null>;
  policyId?: string;
  getPolicyById?: (id: string) => Policy | undefined;
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
  getPolicyById,
}: PolicyDialogProps) {
  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold text-foreground">
            {policyId ? 'Edit Policy' : 'New Policy'}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {policyId
              ? 'Update the policy details below'
              : 'Fill in the details to add a new policy'}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1">
          <PolicyForm
            policyId={policyId}
            onClose={handleClose}
            addPolicy={onSave}
            updatePolicy={async () => {
              /* handled by PolicyForm internally */
            }}
            getPolicyById={getPolicyById || (() => undefined)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
