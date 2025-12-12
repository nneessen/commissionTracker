// /home/nneessen/projects/commissionTracker/src/features/policies/PolicyForm.tsx

import React, { useState, useEffect } from "react";
import {useAuth} from "../../contexts/AuthContext";
import {useCarriers} from "../../hooks/carriers";
import {useProducts} from "../../hooks/products/useProducts";
import {useCompGuide} from "../../hooks/comps";
import {supabase} from "../../services/base/supabase";
import {NewPolicyForm, PolicyStatus, PaymentFrequency, Policy} from "../../types/policy.types";
import {ProductType} from "../../types/commission.types";
import {US_STATES} from "../../types/agent.types";
import {formatDateForDB} from "../../lib/date";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Textarea} from "@/components/ui/textarea";
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from "@/components/ui/select";

import {calculateAnnualPremium, calculatePaymentAmount, calculateExpectedCommission, validatePremium, validateCommissionPercentage} from "../../utils/policyCalculations";

interface PolicyFormProps {
  policyId?: string;
  onClose: () => void;
  addPolicy: (form: NewPolicyForm) => Promise<Policy | null>;
  updatePolicy: (id: string, updates: Partial<NewPolicyForm>) => Promise<void>;
  getPolicyById: (id: string) => Policy | undefined;
}

export const PolicyForm: React.FC<PolicyFormProps> = ({
  policyId,
  onClose,
  addPolicy,
  updatePolicy,
  getPolicyById,
}) => {
  const { user } = useAuth();
  const { data: carriers = [] } = useCarriers();

  const userContractLevel = user?.contractCompLevel || 100;

  const [formData, setFormData] = useState<NewPolicyForm>({
    clientName: "",
    clientState: "",
    clientAge: 0,
    carrierId: "",
    productId: "", // Use productId to link to products table
    product: "term_life" as ProductType,
    policyNumber: "",
    submitDate: formatDateForDB(new Date()),
    effectiveDate: formatDateForDB(new Date()),
    premium: 0,
    paymentFrequency: "monthly" as PaymentFrequency,
    commissionPercentage: 0,
    status: "pending" as PolicyStatus,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [productCommissionRates, setProductCommissionRates] = useState<
    Record<string, number>
  >({});

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

  useEffect(() => {
    if (policyId) {
      const policy = getPolicyById(policyId);
      if (policy) {
        setFormData({
          clientName: policy.client.name,
          clientState: policy.client.state,
          clientAge: policy.client.age,
          carrierId: policy.carrierId,
          productId: policy.productId || "",
          product: policy.product,
          policyNumber: policy.policyNumber,
          submitDate:
            policy.submitDate || formatDateForDB(new Date()),
          effectiveDate:
            policy.effectiveDate || formatDateForDB(new Date()),
          premium: calculatePaymentAmount(
            policy.annualPremium,
            policy.paymentFrequency,
          ),
          paymentFrequency: policy.paymentFrequency,
          commissionPercentage: policy.commissionPercentage * 100,
          status: policy.status,
          notes: policy.notes || "",
        });
      } else {
        console.error("❌ PolicyForm: Policy not found for id:", policyId);
      }
    }
  }, [policyId, getPolicyById]);

  // When products load and we're editing a policy without productId, try to find matching product
  useEffect(() => {
    if (
      policyId &&
      formData.carrierId &&
      !formData.productId &&
      formData.product &&
      products.length > 0
    ) {
      // Try to find a product that matches the carrier and product type
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
    formData.carrierId,
    formData.productId,
    formData.product,
    products,
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
    // Don't override commission percentage when editing an existing policy
    if (policyId) {
      return;
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
  }, [formData.productId, compGuideData, products, policyId]);

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
    // Handle carrier change - reset product selection
    if (name === "carrierId") {
      setFormData((prev) => ({
        ...prev,
        carrierId: value,
        productId: "", // Reset product when carrier changes
        commissionPercentage: 0,
      }));
    }
    // Handle product change - commission will be set by useEffect watching compGuideData
    else if (name === "productId") {
      const selectedProduct = products.find((p) => p.id === value);
      setFormData((prev) => ({
        ...prev,
        productId: value,
        product: selectedProduct?.product_type || ("term_life" as ProductType),
        commissionPercentage: 0, // Will be updated by useEffect
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
    if (!formData.policyNumber)
      newErrors.policyNumber = "Policy number is required";
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
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
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
          onClose(); // Close dialog after successful update
        } else {
          await addPolicy(submissionData);
          onClose(); // Close dialog after successful add
        }
      } catch (error) {
        alert(
          `Error: ${error instanceof Error ? error.message : "Failed to save policy"}`,
        );
      }
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
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto">
        {/* Left Column - Client Information */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground m-0 mb-2 pb-2">
            Client Information
          </h3>
          <div className="h-px bg-gradient-to-r from-muted/50 via-muted/30 to-transparent mb-3"></div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="clientName" className="text-[13px]">
              Client Name *
            </Label>
            <Input
              id="clientName"
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              className={errors.clientName ? "border-destructive" : ""}
              placeholder="John Smith"
            />
            {errors.clientName && (
              <span className="text-[11px] text-destructive">
                {errors.clientName}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="clientState" className="text-[13px]">
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
                  className={errors.clientState ? "border-destructive" : ""}
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
                <span className="text-[11px] text-destructive">
                  {errors.clientState}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="clientAge" className="text-[13px]">
                Age *
              </Label>
              <Input
                id="clientAge"
                type="number"
                name="clientAge"
                value={formData.clientAge || ""}
                onChange={handleInputChange}
                className={errors.clientAge ? "border-destructive" : ""}
                placeholder="45"
                min="1"
                max="120"
              />
              {errors.clientAge && (
                <span className="text-[11px] text-destructive">
                  {errors.clientAge}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="carrierId" className="text-[13px]">
              Carrier *
            </Label>
            <Select
              value={formData.carrierId}
              onValueChange={(value) => handleSelectChange("carrierId", value)}
            >
              <SelectTrigger
                id="carrierId"
                className={errors.carrierId ? "border-destructive" : ""}
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
              <span className="text-[11px] text-destructive">
                {errors.carrierId}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="productId" className="text-[13px]">
              Product *
            </Label>
            <Select
              value={formData.productId}
              onValueChange={(value) => handleSelectChange("productId", value)}
              disabled={!formData.carrierId || productsLoading}
            >
              <SelectTrigger
                id="productId"
                className={errors.productId ? "border-destructive" : ""}
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
              <span className="text-[11px] text-destructive">
                {errors.productId}
              </span>
            )}
            {formData.carrierId &&
              !productsLoading &&
              products.length === 0 && (
                <span className="text-[11px] text-destructive">
                  ⚠️ This carrier has no products configured. Please contact
                  admin or select a different carrier.
                </span>
              )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="notes" className="text-[13px]">
              Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Optional notes..."
              className="resize-vertical min-h-[60px]"
            />
          </div>
        </div>

        {/* Right Column - Policy Details */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground m-0 mb-2 pb-2">
            Policy Details
          </h3>
          <div className="h-px bg-gradient-to-r from-muted/50 via-muted/30 to-transparent mb-3"></div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="policyNumber" className="text-[13px]">
              Policy Number *
            </Label>
            <Input
              id="policyNumber"
              type="text"
              name="policyNumber"
              value={formData.policyNumber}
              onChange={handleInputChange}
              className={errors.policyNumber ? "border-destructive" : ""}
              placeholder="POL-123456"
            />
            {errors.policyNumber && (
              <span className="text-[11px] text-destructive">
                {errors.policyNumber}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="submitDate" className="text-[13px]">
              Submit Date *
            </Label>
            <Input
              id="submitDate"
              type="date"
              name="submitDate"
              value={formData.submitDate}
              onChange={handleInputChange}
              className={errors.submitDate ? "border-destructive" : ""}
            />
            {errors.submitDate && (
              <span className="text-[11px] text-destructive">
                {errors.submitDate}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="effectiveDate" className="text-[13px]">
              Effective Date *
            </Label>
            <Input
              id="effectiveDate"
              type="date"
              name="effectiveDate"
              value={formData.effectiveDate}
              onChange={handleInputChange}
              className={errors.effectiveDate ? "border-destructive" : ""}
            />
            {errors.effectiveDate && (
              <span className="text-[11px] text-destructive">
                {errors.effectiveDate}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="premium" className="text-[13px]">
                Premium Amount *
              </Label>
              <Input
                id="premium"
                type="number"
                name="premium"
                value={formData.premium || ""}
                onChange={handleInputChange}
                className={errors.premium ? "border-destructive" : ""}
                placeholder="250.00"
                step="0.01"
                min="0"
              />
              {errors.premium && (
                <span className="text-[11px] text-destructive">
                  {errors.premium}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paymentFrequency" className="text-[13px]">
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
                <SelectTrigger id="paymentFrequency">
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="status" className="text-[13px]">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) =>
                handleSelectChange("status", value as PolicyStatus)
              }
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="lapsed">Lapsed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calculated Values */}
          <div className="flex flex-col gap-2 p-3 bg-gradient-to-br from-info/20 via-status-earned/10 to-card rounded-md shadow-md">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-muted-foreground">Annual Premium:</span>
              <strong className="text-info font-semibold font-mono">
                ${annualPremium.toFixed(2)}
              </strong>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-muted-foreground">Commission Rate:</span>
              <strong className="text-primary font-semibold">
                {formData.commissionPercentage.toFixed(2)}%
              </strong>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-muted-foreground">
                Expected Advance (9 months):
              </span>
              <strong className="text-success font-semibold font-mono">
                ${expectedCommission.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 p-4 px-6 bg-gradient-to-r from-muted/30 to-card shadow-sm">
        <Button type="button" onClick={onClose} variant="outline" size="sm">
          Cancel
        </Button>
        <Button type="submit" size="sm">
          {policyId ? "Update Policy" : "Add Policy"}
        </Button>
      </div>
    </form>
  );
};
