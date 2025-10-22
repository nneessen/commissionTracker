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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policyId ? 'Edit Policy' : 'New Policy Submission'}</DialogTitle>
          <DialogDescription>
            {policyId
              ? 'Update the policy details below.'
              : 'Fill in the details to add a new policy.'}
          </DialogDescription>
        </DialogHeader>

        <PolicyForm
          policyId={policyId}
          onClose={handleClose}
          addPolicy={onSave}
          updatePolicy={async () => {
            /* handled by PolicyForm internally */
          }}
          getPolicyById={getPolicyById || (() => undefined)}
        />
      </DialogContent>
    </Dialog>
  );
}
