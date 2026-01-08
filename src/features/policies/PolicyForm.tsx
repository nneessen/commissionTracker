// /home/nneessen/projects/commissionTracker/src/features/policies/PolicyForm.tsx

import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCarriers } from "../../hooks/carriers";
import { useProducts } from "../../hooks/products/useProducts";
import { useCompGuide } from "../../hooks/comps";
import { supabase } from "../../services/base/supabase";
import {
  NewPolicyForm,
  PolicyStatus,
  PaymentFrequency,
  Policy,
} from "../../types/policy.types";
import { ProductType } from "../../types/commission.types";
import { US_STATES } from "../../types/user.types";
import { formatDateForDB } from "../../lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

import {
  calculateAnnualPremium,
  calculatePaymentAmount,
  calculateExpectedCommission,
  validatePremium,
  validateCommissionPercentage,
} from "../../utils/policyCalculations";

interface PolicyFormProps {
  policyId?: string;
  policy?: Policy | null;
  onClose: () => void;
  addPolicy: (form: NewPolicyForm) => Promise<Policy | null>;
  updatePolicy: (id: string, updates: Partial<NewPolicyForm>) => Promise<void>;
}

export const PolicyForm: React.FC<PolicyFormProps> = ({
  policyId,
  policy,
  onClose,
  addPolicy,
  updatePolicy,
}) => {
  const { user } = useAuth();
  const { data: carriers = [] } = useCarriers();

  // CRITICAL FIX: Fetch contract_level from user_profiles table, not auth metadata
  // The auth metadata often doesn't have contract_level, causing wrong comp lookups
  const [dbContractLevel, setDbContractLevel] = useState<number | null>(null);

  useEffect(() => {
    const fetchContractLevel = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("user_profiles")
        .select("contract_level")
        .eq("id", user.id)
        .single();

      if (!error && data?.contract_level) {
        setDbContractLevel(data.contract_level);
      }
    };

    fetchContractLevel();
  }, [user?.id]);

  // Use DB contract_level if available, fall back to auth metadata, then default to 100
  const userContractLevel = dbContractLevel || user?.contract_level || 100;

  // Helper function to create initial form data from policy
  const createInitialFormData = (): NewPolicyForm => {
    // If editing and policy data is available, use it for initial state
    if (policyId && policy) {
      return {
        clientName: policy.client?.name || "",
        clientState: policy.client?.state || "",
        clientAge: policy.client?.age || 0,
        clientEmail: policy.client?.email || "",
        clientPhone: policy.client?.phone || "",
        carrierId: policy.carrierId || "",
        productId: policy.productId || "",
        product: policy.product,
        policyNumber: policy.policyNumber || "",
        submitDate: policy.submitDate || formatDateForDB(new Date()),
        effectiveDate: policy.effectiveDate || formatDateForDB(new Date()),
        premium: calculatePaymentAmount(
          policy.annualPremium || 0,
          policy.paymentFrequency,
        ),
        paymentFrequency: policy.paymentFrequency || "monthly",
        commissionPercentage: (policy.commissionPercentage || 0) * 100,
        status: policy.status || "pending",
        notes: policy.notes || "",
      };
    }
    // Default empty form for new policies
    return {
      clientName: "",
      clientState: "",
      clientAge: 0,
      carrierId: "",
      productId: "",
      product: "term_life" as ProductType,
      policyNumber: "",
      submitDate: formatDateForDB(new Date()),
      effectiveDate: formatDateForDB(new Date()),
      premium: 0,
      paymentFrequency: "monthly" as PaymentFrequency,
      commissionPercentage: 0,
      status: "pending" as PolicyStatus,
      notes: "",
    };
  };

  // Initialize form with policy data if available at mount time
  const [formData, setFormData] = useState<NewPolicyForm>(
    createInitialFormData,
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productCommissionRates, setProductCommissionRates] = useState<
    Record<string, number>
  >({});

  // Track initial productId to detect user-initiated changes in edit mode
  // This allows commission updates when user explicitly changes product
  // Initialize with policy's productId if editing
  const [initialProductId, setInitialProductId] = useState<string | null>(
    policyId && policy ? policy.productId || null : null,
  );

  // Fetch products for selected carrier
  const {
    data: products = [],
    isLoading: productsLoading,
    error: _productsError,
  } = useProducts(formData.carrierId);

  // Fetch commission rate from comp_guide based on product and user's contract level
  const { data: compGuideData } = useCompGuide(
    formData.productId || "",
    userContractLevel,
  );

  // Populate form when editing an existing policy
  // Note: We populate immediately when policy is available, regardless of carriers loading state
  // The form fields will show the values even if carrier dropdown hasn't loaded yet
  useEffect(() => {
    if (!policyId || !policy) {
      return;
    }

    // Debug: Log when form population should happen
    console.log("[PolicyForm] Populating form for policy:", {
      policyId,
      policyNumber: policy.policyNumber,
      clientName: policy.client?.name,
      carrierId: policy.carrierId,
      carriersLoaded: carriers.length,
    });

    const newFormData: NewPolicyForm = {
      clientName: policy.client?.name || "",
      clientState: policy.client?.state || "",
      clientAge: policy.client?.age || 0,
      clientEmail: policy.client?.email || "",
      clientPhone: policy.client?.phone || "",
      carrierId: policy.carrierId || "",
      productId: policy.productId || "",
      product: policy.product,
      policyNumber: policy.policyNumber || "",
      submitDate: policy.submitDate || formatDateForDB(new Date()),
      effectiveDate: policy.effectiveDate || formatDateForDB(new Date()),
      premium: calculatePaymentAmount(
        policy.annualPremium || 0,
        policy.paymentFrequency,
      ),
      paymentFrequency: policy.paymentFrequency || "monthly",
      commissionPercentage: (policy.commissionPercentage || 0) * 100,
      status: policy.status || "pending",
      notes: policy.notes || "",
    };

    setFormData(newFormData);
    // Track initial productId to detect user-initiated changes
    setInitialProductId(policy.productId || null);
  }, [policyId, policy]);

  // When products load and we're editing a policy without productId, auto-match by product type
  useEffect(() => {
    // Only run for edit mode when products are loaded but productId is empty
    if (!policyId || products.length === 0) return;

    // Check if we need to auto-select (formData has carrierId and product type but no productId)
    if (formData.carrierId && !formData.productId && formData.product) {
      const matchingProduct = products.find(
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
    products,
    formData.carrierId,
    formData.productId,
    formData.product,
  ]);

  // Fetch commission rates for all products when products change
  useEffect(() => {
    const fetchProductCommissionRates = async () => {
      if (products.length === 0) return;

      const today = formatDateForDB(new Date());
      const rates: Record<string, number> = {};

      for (const product of products) {
        const { data } = await supabase
          .from("comp_guide")
          .select("commission_percentage")
          .eq("product_id", product.id)
          .eq("contract_level", userContractLevel)
          .lte("effective_date", today)
          .or(`expiration_date.is.null,expiration_date.gte.${today}`)
          .order("effective_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Use comp_guide rate if available, otherwise fallback to product rate
        rates[product.id] =
          data?.commission_percentage || product.commission_percentage || 0;
      }

      setProductCommissionRates(rates);
    };

    fetchProductCommissionRates();
  }, [products, userContractLevel]);

  // Update commission percentage when comp_guide data changes or fallback to product commission
  useEffect(() => {
    // For edit mode: only skip update if product hasn't changed from initial
    if (policyId) {
      // If product hasn't changed from initial, preserve original commission
      if (!formData.productId || formData.productId === initialProductId) {
        return;
      }
      // Product was explicitly changed by user - continue to update commission
    }

    if (formData.productId && compGuideData) {
      // Use comp_guide commission rate (contract-level based)
      setFormData((prev) => ({
        ...prev,
        commissionPercentage: compGuideData.commission_percentage * 100, // Convert decimal to percentage
      }));
    } else if (formData.productId && !compGuideData) {
      // Fallback to product commission rate
      const selectedProduct = products.find((p) => p.id === formData.productId);
      setFormData((prev) => ({
        ...prev,
        commissionPercentage: selectedProduct?.commission_percentage
          ? selectedProduct.commission_percentage * 100
          : 0,
      }));
    }
  }, [formData.productId, compGuideData, products, policyId, initialProductId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;

    // Handle other fields
    setFormData((prev) => ({
      ...prev,
      [name]: ["clientAge", "premium"].includes(name)
        ? parseFloat(value) || 0
        : value,
    }));

    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    // Ignore empty values - Radix Select triggers onValueChange("") on mount
    // when the controlled value doesn't match any SelectItem yet
    if (!value) {
      return;
    }

    // Handle carrier change - reset product selection
    if (name === "carrierId") {
      setFormData((prev) => {
        // Only reset product/commission if carrier actually changed
        const carrierChanged = prev.carrierId !== value;
        return {
          ...prev,
          carrierId: value,
          // Only reset these if carrier actually changed (not just initial population)
          productId: carrierChanged ? "" : prev.productId,
          commissionPercentage: carrierChanged ? 0 : prev.commissionPercentage,
        };
      });
    }
    // Handle product change - commission will be set by useEffect watching compGuideData
    else if (name === "productId") {
      const selectedProduct = products.find((p) => p.id === value);
      setFormData((prev) => ({
        ...prev,
        productId: value,
        product: selectedProduct?.product_type || ("term_life" as ProductType),
        // Don't reset commission here - let the useEffect handle it based on comp_guide data
      }));
    }
    // Handle other select fields
    else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error when user changes
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName) newErrors.clientName = "Client name is required";
    if (!formData.clientState) newErrors.clientState = "State is required";
    if (
      !formData.clientAge ||
      formData.clientAge < 1 ||
      formData.clientAge > 120
    ) {
      newErrors.clientAge = "Valid age is required (1-120)";
    }
    if (!formData.carrierId) newErrors.carrierId = "Carrier is required";
    if (!formData.productId) newErrors.productId = "Product is required";
    // policyNumber is optional - validation removed
    if (!formData.submitDate) newErrors.submitDate = "Submit date is required";
    if (!formData.effectiveDate)
      newErrors.effectiveDate = "Effective date is required";

    if (!validatePremium(formData.premium)) {
      newErrors.premium = "Premium must be greater than $0";
    }

    if (!validateCommissionPercentage(formData.commissionPercentage)) {
      newErrors.commissionPercentage = "Commission must be between 0-200%";
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;

    if (!isValid) {
      // Show toast with first error for visibility
      const firstError = Object.values(newErrors)[0];
      toast.error(`Please fix errors: ${firstError}`);
    }

    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Toast already shown by validateForm
      return;
    }

    // Calculate annual premium before submitting
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-4 overflow-y-auto">
        {/* Left Column - Client Information */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wider m-0">
            Client Information
          </h3>
          <div className="h-px bg-border mb-1"></div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="clientName"
              className="text-[11px] text-muted-foreground"
            >
              Client Name *
            </Label>
            <Input
              id="clientName"
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              className={`h-8 text-[11px] ${errors.clientName ? "border-destructive" : "border-input"}`}
              placeholder="John Smith"
            />
            {errors.clientName && (
              <span className="text-[10px] text-destructive">
                {errors.clientName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="clientState"
                className="text-[11px] text-muted-foreground"
              >
                State *
              </Label>
              <Select
                value={formData.clientState}
                onValueChange={(value) =>
                  handleSelectChange("clientState", value)
                }
              >
                <SelectTrigger
                  id="clientState"
                  className={`h-8 text-[11px] ${errors.clientState ? "border-destructive" : "border-input"}`}
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state.value} value={state.value}>
                      {state.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientState && (
                <span className="text-[10px] text-destructive">
                  {errors.clientState}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="clientAge"
                className="text-[11px] text-muted-foreground"
              >
                Age *
              </Label>
              <Input
                id="clientAge"
                type="number"
                name="clientAge"
                value={formData.clientAge || ""}
                onChange={handleInputChange}
                className={`h-8 text-[11px] ${errors.clientAge ? "border-destructive" : "border-input"}`}
                placeholder="45"
                min="1"
                max="120"
              />
              {errors.clientAge && (
                <span className="text-[10px] text-destructive">
                  {errors.clientAge}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="carrierId"
              className="text-[11px] text-muted-foreground"
            >
              Carrier *
            </Label>
            <Select
              value={formData.carrierId}
              onValueChange={(value) => handleSelectChange("carrierId", value)}
            >
              <SelectTrigger
                id="carrierId"
                className={`h-8 text-[11px] ${errors.carrierId ? "border-destructive" : "border-input"}`}
              >
                <SelectValue placeholder="Select Carrier" />
              </SelectTrigger>
              <SelectContent>
                {carriers.map((carrier) => (
                  <SelectItem key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.carrierId && (
              <span className="text-[10px] text-destructive">
                {errors.carrierId}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="productId"
              className="text-[11px] text-muted-foreground"
            >
              Product *
            </Label>
            <Select
              value={formData.productId}
              onValueChange={(value) => handleSelectChange("productId", value)}
              disabled={!formData.carrierId || productsLoading}
            >
              <SelectTrigger
                id="productId"
                className={`h-8 text-[11px] ${errors.productId ? "border-destructive" : "border-input"}`}
              >
                <SelectValue
                  placeholder={
                    !formData.carrierId
                      ? "Select a carrier first"
                      : productsLoading
                        ? "Loading products..."
                        : products.length === 0
                          ? "No products available for this carrier"
                          : "Select Product"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                    {productCommissionRates[product.id] &&
                      ` (${(productCommissionRates[product.id] * 100).toFixed(1)}% commission)`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.productId && (
              <span className="text-[10px] text-destructive">
                {errors.productId}
              </span>
            )}
            {formData.carrierId &&
              !productsLoading &&
              products.length === 0 && (
                <span className="text-[10px] text-destructive">
                  This carrier has no products configured. Please contact admin
                  or select a different carrier.
                </span>
              )}
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="notes"
              className="text-[11px] text-muted-foreground"
            >
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={2}
              placeholder="Optional notes..."
              className="text-[11px] resize-vertical min-h-[50px] border-input"
            />
          </div>
        </div>

        {/* Right Column - Policy Details */}
        <div className="flex flex-col gap-3">
          <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wider m-0">
            Policy Details
          </h3>
          <div className="h-px bg-border mb-1"></div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="policyNumber"
              className="text-[11px] text-muted-foreground"
            >
              Policy Number
            </Label>
            <Input
              id="policyNumber"
              type="text"
              name="policyNumber"
              value={formData.policyNumber}
              onChange={handleInputChange}
              className={`h-8 text-[11px] ${errors.policyNumber ? "border-destructive" : "border-input"}`}
              placeholder="POL-123456"
            />
            <span className="text-[10px] text-muted-foreground">
              Optional - leave blank if not yet assigned
            </span>
            {errors.policyNumber && (
              <span className="text-[10px] text-destructive">
                {errors.policyNumber}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="submitDate"
                className="text-[11px] text-muted-foreground"
              >
                Submit Date *
              </Label>
              <Input
                id="submitDate"
                type="date"
                name="submitDate"
                value={formData.submitDate}
                onChange={handleInputChange}
                className={`h-8 text-[11px] ${errors.submitDate ? "border-destructive" : "border-input"}`}
              />
              {errors.submitDate && (
                <span className="text-[10px] text-destructive">
                  {errors.submitDate}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label
                htmlFor="effectiveDate"
                className="text-[11px] text-muted-foreground"
              >
                Effective Date *
              </Label>
              <Input
                id="effectiveDate"
                type="date"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleInputChange}
                className={`h-8 text-[11px] ${errors.effectiveDate ? "border-destructive" : "border-input"}`}
              />
              {errors.effectiveDate && (
                <span className="text-[10px] text-destructive">
                  {errors.effectiveDate}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="premium"
                className="text-[11px] text-muted-foreground"
              >
                Premium Amount *
              </Label>
              <Input
                id="premium"
                type="number"
                name="premium"
                value={formData.premium || ""}
                onChange={handleInputChange}
                className={`h-8 text-[11px] ${errors.premium ? "border-destructive" : "border-input"}`}
                placeholder="250.00"
                step="0.01"
                min="0"
              />
              {errors.premium && (
                <span className="text-[10px] text-destructive">
                  {errors.premium}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <Label
                htmlFor="paymentFrequency"
                className="text-[11px] text-muted-foreground"
              >
                Payment Frequency *
              </Label>
              <Select
                value={formData.paymentFrequency}
                onValueChange={(value) =>
                  handleSelectChange(
                    "paymentFrequency",
                    value as PaymentFrequency,
                  )
                }
              >
                <SelectTrigger
                  id="paymentFrequency"
                  className="h-8 text-[11px] border-input"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="semi_annual">Semi-Annual</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="status"
              className="text-[11px] text-muted-foreground"
            >
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                handleSelectChange("status", value as PolicyStatus)
              }
            >
              <SelectTrigger
                id="status"
                className="h-8 text-[11px] border-input"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                {policyId && (
                  <>
                    <SelectItem value="lapsed">Lapsed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Calculated Values */}
          <div className="flex flex-col gap-1.5 p-2.5 bg-muted rounded border border-border">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Annual Premium:</span>
              <strong className="text-[hsl(var(--info))] font-semibold font-mono">
                ${annualPremium.toFixed(2)}
              </strong>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">Commission Rate:</span>
              <strong className="text-foreground font-semibold">
                {formData.commissionPercentage.toFixed(2)}%
              </strong>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-muted-foreground">
                Expected Advance (9 mo):
              </span>
              <strong className="text-[hsl(var(--success))] font-semibold font-mono">
                ${expectedCommission.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 p-3 border-t border-border">
        <Button
          type="button"
          onClick={onClose}
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] px-3"
        >
          Cancel
        </Button>
        <Button type="submit" size="sm" className="h-7 text-[11px] px-3">
          {policyId ? "Update Policy" : "Add Policy"}
        </Button>
      </div>
    </form>
  );
};
