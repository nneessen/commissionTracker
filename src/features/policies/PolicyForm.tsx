// src/features/policies/PolicyForm.tsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCarriers } from "../../hooks/carriers";
import { useProducts } from "../../hooks/products/useProducts";
import { NewPolicyForm, Policy } from "../../types/policy.types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  calculateAnnualPremium,
  calculateExpectedCommission,
} from "../../utils/policyCalculations";

import { usePolicyForm, createInitialFormData } from "./hooks/usePolicyForm";
import {
  usePolicyCommission,
  useUserContractLevel,
} from "./hooks/usePolicyCommission";
import { PolicyFormClientSection } from "./components/PolicyFormClientSection";
import { PolicyFormPolicySection } from "./components/PolicyFormPolicySection";

interface PolicyFormProps {
  policyId?: string;
  policy?: Policy | null;
  onClose: () => void;
  addPolicy: (form: NewPolicyForm) => Promise<Policy | null>;
  updatePolicy: (id: string, updates: Partial<NewPolicyForm>) => Promise<void>;
  /** External validation errors from service layer (e.g., duplicate policy number) */
  externalErrors?: Record<string, string>;
  /** Parent mutation pending state */
  isPending?: boolean;
  /** Callback to notify parent when form submission state changes */
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

export const PolicyForm: React.FC<PolicyFormProps> = ({
  policyId,
  policy,
  onClose,
  addPolicy,
  updatePolicy,
  externalErrors = {},
  isPending = false,
  onSubmittingChange,
}) => {
  const { user } = useAuth();

  // LOCAL submission state - becomes true IMMEDIATELY on click, before any async work
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combined loading state - true if either local or parent says we're loading
  const isLoading = isSubmitting || isPending;

  // Notify parent when submission state changes
  useEffect(() => {
    onSubmittingChange?.(isSubmitting);
  }, [isSubmitting, onSubmittingChange]);
  const { data: carriers = [] } = useCarriers();

  const userContractLevel = useUserContractLevel(
    user?.id,
    user?.contract_level || 100,
  );

  // Track carrierId separately for the products query.
  // For edit mode: initialized from policy so products load immediately.
  // For new mode: empty until user selects a carrier.
  const [productQueryCarrierId, setProductQueryCarrierId] = useState<string>(
    policy?.carrierId || "",
  );

  const { data: products = [], isLoading: productsLoading } = useProducts(
    productQueryCarrierId,
  );

  const {
    formData,
    setFormData,
    errors,
    initialProductId,
    setInitialProductId,
    handleInputChange,
    handleSelectChange,
    handlePhoneChange,
    handleDOBChange,
    validateForm,
  } = usePolicyForm({
    policyId,
    policy,
    products,
  });

  // Sync productQueryCarrierId when carrier changes in the form
  useEffect(() => {
    if (formData.carrierId !== productQueryCarrierId) {
      setProductQueryCarrierId(formData.carrierId);
    }
  }, [formData.carrierId, productQueryCarrierId]);

  const carrierProducts = products.filter(
    (p) => p.carrier_id === formData.carrierId,
  );

  // Get commission data
  const {
    commissionPercentage: calculatedCommission,
    termModifiers,
    productCommissionRates,
  } = usePolicyCommission({
    productId: formData.productId,
    userContractLevel,
    products: carrierProducts,
    termLength: formData.termLength,
    isEditMode: !!policyId,
    initialProductId,
  });

  useEffect(() => {
    if (!policyId || formData.productId !== initialProductId) {
      if (calculatedCommission > 0) {
        setFormData((prev) => ({
          ...prev,
          commissionPercentage: calculatedCommission,
        }));
      }
    }
  }, [
    calculatedCommission,
    policyId,
    formData.productId,
    initialProductId,
    setFormData,
  ]);

  const [showContactDetails, setShowContactDetails] = useState(
    !!(
      policyId &&
      policy &&
      (policy.client?.email ||
        policy.client?.phone ||
        policy.client?.street ||
        policy.client?.city ||
        policy.client?.zipCode)
    ),
  );

  useEffect(() => {
    if (!policyId || !policy) {
      return;
    }

    const newFormData = createInitialFormData(policyId, policy);
    setFormData(newFormData);
    setInitialProductId(policy.productId || null);
  }, [policyId, policy, carriers.length, setFormData, setInitialProductId]);

  useEffect(() => {
    if (!policyId || carrierProducts.length === 0) return;

    if (formData.carrierId && !formData.productId && formData.product) {
      const matchingProduct = carrierProducts.find(
        (p) =>
          p.carrier_id === formData.carrierId &&
          p.product_type === formData.product,
      );

      if (matchingProduct) {
        setFormData((prev) => ({
          ...prev,
          productId: matchingProduct.id,
        }));
      }
    }
  }, [
    policyId,
    carrierProducts,
    formData.carrierId,
    formData.productId,
    formData.product,
    setFormData,
  ]);

  const displayErrors = { ...errors, ...externalErrors };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // GUARD: Prevent any submission if already in progress
    if (isLoading) {
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Set local state IMMEDIATELY - before any async work
    // This prevents double-clicks even before the mutation isPending kicks in
    setIsSubmitting(true);

    const annualPremium = calculateAnnualPremium(
      formData.premium,
      formData.paymentFrequency,
    );

    const submissionData = {
      ...formData,
      annualPremium,
    };

    try {
      if (policyId) {
        await updatePolicy(policyId, submissionData);
        onClose();
      } else {
        await addPolicy(submissionData);
        onClose();
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save policy",
      );
    } finally {
      // Always reset local state, even on error
      setIsSubmitting(false);
    }
  };

  // Calculate display values
  const annualPremium = calculateAnnualPremium(
    formData.premium,
    formData.paymentFrequency,
  );
  const expectedCommission = calculateExpectedCommission(
    annualPremium,
    formData.commissionPercentage,
  );

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 flex flex-col overflow-hidden"
    >
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-y-auto">
        {/* Left Column - Client Information */}
        <PolicyFormClientSection
          formData={formData}
          displayErrors={displayErrors}
          carriers={carriers}
          products={carrierProducts}
          productsLoading={productsLoading}
          productCommissionRates={productCommissionRates}
          termModifiers={termModifiers}
          showContactDetails={showContactDetails}
          onShowContactDetailsChange={setShowContactDetails}
          onInputChange={handleInputChange}
          onSelectChange={handleSelectChange}
          onPhoneChange={handlePhoneChange}
          onDOBChange={handleDOBChange}
        />

        {/* Right Column - Policy Details */}
        <PolicyFormPolicySection
          formData={formData}
          displayErrors={displayErrors}
          policyId={policyId}
          annualPremium={annualPremium}
          expectedCommission={expectedCommission}
          onInputChange={handleInputChange}
          onSelectChange={handleSelectChange}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/50 bg-zinc-50/50 dark:bg-zinc-800/30">
        <Button
          type="button"
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isLoading}
          className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              {policyId ? "Saving..." : "Creating..."}
            </>
          ) : (
            policyId ? "Update Policy" : "Add Policy"
          )}
        </Button>
      </div>
    </form>
  );
};
