// src/features/policies/hooks/usePolicyMutations.ts

import { useAuth } from "../../../contexts/AuthContext";
import {
  useCreatePolicy,
  useUpdatePolicy,
  useDeletePolicy,
} from "../../../hooks/policies";
import { clientService } from "../../../services/clients/clientService";
import showToast from "../../../utils/toast";
import {
  PolicyStatus,
  CreatePolicyData,
  NewPolicyForm,
  Policy,
} from "../../../types/policy.types";

/**
 * Custom hook providing adapter functions for policy mutations
 * Handles client creation/lookup and data transformation for PolicyForm/PolicyList
 */
export const usePolicyMutations = (refetch: () => void) => {
  const { user } = useAuth();
  const createPolicyMutation = useCreatePolicy();
  const updatePolicyMutation = useUpdatePolicy();
  const deletePolicyMutation = useDeletePolicy();

  const addPolicy = async (formData: NewPolicyForm): Promise<Policy | null> => {
    try {
      // Verify user is authenticated
      if (!user?.id) {
        throw new Error('You must be logged in to create a policy');
      }

      // Create or find the client (with user_id for RLS compliance)
      const client = await clientService.createOrFind({
        name: formData.clientName,
        email: formData.clientEmail || undefined,
        phone: formData.clientPhone || undefined,
        address: {
          state: formData.clientState,
          age: formData.clientAge,
        } as any, // JSONB field supports age, but TypeScript interface is incomplete
      }, user.id);

      // Calculate monthly premium based on payment frequency
      const monthlyPremium = formData.paymentFrequency === 'annual'
        ? (formData.annualPremium || 0) / 12
        : formData.paymentFrequency === 'semi-annual'
        ? (formData.annualPremium || 0) / 6
        : formData.paymentFrequency === 'quarterly'
        ? (formData.annualPremium || 0) / 3
        : (formData.annualPremium || 0) / 12; // Default to monthly

      // Validate commission percentage (database DECIMAL(5,4) = max 999.99%)
      const commissionPercent = formData.commissionPercentage || 0;
      if (commissionPercent < 0 || commissionPercent > 999.99) {
        showToast.error('Commission percentage must be between 0 and 999.99');
        throw new Error('Commission percentage must be between 0 and 999.99');
      }

      // Convert form data to match actual database schema
      const policyData: CreatePolicyData = {
        policyNumber: formData.policyNumber,
        status: formData.status,
        clientId: client.id,
        userId: user.id,
        carrierId: formData.carrierId,
        product: formData.product,
        effectiveDate: new Date(formData.effectiveDate),
        termLength: formData.termLength,
        expirationDate: formData.expirationDate
          ? new Date(formData.expirationDate)
          : undefined,
        annualPremium: formData.annualPremium || 0,
        monthlyPremium: monthlyPremium,
        paymentFrequency: formData.paymentFrequency,
        commissionPercentage: commissionPercent / 100,
        notes: formData.notes || undefined,
      };

      return new Promise<Policy | null>((resolve, reject) => {
        createPolicyMutation.mutate(policyData, {
          onSuccess: (data) => {
            showToast.success(`Policy ${data.policyNumber} created successfully!`);
            refetch();
            resolve(data);
          },
          onError: (error: Error) => {
            const errorMessage = error?.message || 'Failed to create policy. Please try again.';
            showToast.error(errorMessage);
            reject(error);
          },
        });
      });
    } catch (error) {
      showToast.error('Failed to create policy. Please try again.');
      throw error;
    }
  };

  const updatePolicy = async (
    id: string,
    updates: Partial<NewPolicyForm>
  ): Promise<void> => {
    let policyData: Partial<CreatePolicyData>;

    if ("clientName" in updates && updates.clientName) {
      // Verify user is authenticated
      if (!user?.id) {
        throw new Error('You must be logged in to update a policy');
      }

      // Create or find the client
      const client = await clientService.createOrFind({
        name: updates.clientName,
        email: updates.clientEmail || undefined,
        phone: updates.clientPhone || undefined,
        address: {
          state: updates.clientState,
          age: updates.clientAge,
        } as any, // JSONB field supports age, but TypeScript interface is incomplete
      }, user.id);

      // Validate commission percentage
      const updateCommissionPercent = updates.commissionPercentage || 0;
      if (updateCommissionPercent < 0 || updateCommissionPercent > 999.99) {
        showToast.error('Commission percentage must be between 0 and 999.99');
        throw new Error('Commission percentage must be between 0 and 999.99');
      }

      // Calculate monthly premium based on payment frequency
      const monthlyPremium = updates.paymentFrequency === 'annual'
        ? (updates.annualPremium || 0) / 12
        : updates.paymentFrequency === 'semi-annual'
        ? (updates.annualPremium || 0) / 6
        : updates.paymentFrequency === 'quarterly'
        ? (updates.annualPremium || 0) / 3
        : (updates.annualPremium || 0) / 12;

      policyData = {
        policyNumber: updates.policyNumber,
        status: updates.status,
        clientId: client.id,
        carrierId: updates.carrierId,
        product: updates.product,
        effectiveDate: updates.effectiveDate ? new Date(updates.effectiveDate) : undefined,
        termLength: updates.termLength,
        expirationDate: updates.expirationDate
          ? new Date(updates.expirationDate)
          : undefined,
        annualPremium: updates.annualPremium || 0,
        monthlyPremium: monthlyPremium,
        paymentFrequency: updates.paymentFrequency,
        commissionPercentage: updateCommissionPercent / 100,
        notes: updates.notes,
      };
    } else {
      // Convert dates if present in updates
      policyData = {
        ...updates,
        effectiveDate: updates.effectiveDate ? new Date(updates.effectiveDate) : undefined,
        expirationDate: updates.expirationDate ? new Date(updates.expirationDate) : undefined,
      };
    }

    updatePolicyMutation.mutate(
      { id, updates: policyData },
      {
        onSuccess: () => {
          refetch();
        },
      },
    );
  };

  const updatePolicyStatus = (id: string, status: PolicyStatus) => {
    updatePolicyMutation.mutate(
      { id, updates: { status } as Partial<CreatePolicyData> },
      {
        onSuccess: () => {
          refetch();
        },
      },
    );
  };

  const deletePolicy = (id: string) => {
    deletePolicyMutation.mutate(id, {
      onSuccess: () => {
        refetch();
      },
    });
  };

  return {
    addPolicy,
    updatePolicy,
    updatePolicyStatus,
    deletePolicy,
  };
};
