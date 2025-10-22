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
import { US_STATES } from "../../types/agent.types";
import { Button } from "@/components/ui/button";

import {
  calculateAnnualPremium,
  calculatePaymentAmount,
  calculateExpectedCommission,
  validatePremium,
  validateCommissionPercentage,
} from "../../utils/policyCalculations";

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
    submitDate: new Date().toISOString().split("T")[0],
    effectiveDate: new Date().toISOString().split("T")[0],
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
    error: productsError,
  } = useProducts(formData.carrierId);

  // Fetch commission rate from comp_guide based on product and user's contract level
  const { data: compGuideData } = useCompGuide(
    formData.productId || '',
    userContractLevel,
  );

  useEffect(() => {
    if (policyId) {
      const policy = getPolicyById(policyId);
      console.log('🔍 PolicyForm: Loading policy for edit', { policyId, policy });
      if (policy) {
        console.log('📝 PolicyForm: Setting form data', {
          clientName: policy.client.name,
          clientState: policy.client.state,
          clientAge: policy.client.age,
          carrierId: policy.carrierId,
          productId: policy.productId,
          product: policy.product,
        });
        setFormData({
          clientName: policy.client.name,
          clientState: policy.client.state,
          clientAge: policy.client.age,
          carrierId: policy.carrierId,
          productId: policy.productId || "",
          product: policy.product,
          policyNumber: policy.policyNumber,
          submitDate:
            policy.submitDate instanceof Date
              ? policy.submitDate.toISOString().split("T")[0]
              : policy.submitDate || new Date().toISOString().split("T")[0],
          effectiveDate:
            policy.effectiveDate instanceof Date
              ? policy.effectiveDate.toISOString().split("T")[0]
              : policy.effectiveDate,
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
        console.error('❌ PolicyForm: Policy not found for id:', policyId);
      }
    }
  }, [policyId, getPolicyById]);

  // When products load and we're editing a policy without productId, try to find matching product
  useEffect(() => {
    if (policyId && formData.carrierId && !formData.productId && formData.product && products.length > 0) {
      console.log('🔎 Looking for product matching carrier and product type', {
        carrierId: formData.carrierId,
        productType: formData.product,
        availableProducts: products
      });

      // Try to find a product that matches the carrier and product type
      const matchingProduct = products.find(p =>
        p.carrier_id === formData.carrierId &&
        p.product_type === formData.product
      );

      if (matchingProduct) {
        console.log('✅ Found matching product:', matchingProduct);
        setFormData(prev => ({
          ...prev,
          productId: matchingProduct.id
        }));
      } else {
        console.warn('⚠️ No matching product found for carrier/type', {
          carrierId: formData.carrierId,
          productType: formData.product
        });
      }
    }
  }, [policyId, formData.carrierId, formData.productId, formData.product, products]);

  // Fetch commission rates for all products when products change
  useEffect(() => {
    const fetchProductCommissionRates = async () => {
      if (products.length === 0) return;

      const today = new Date().toISOString().split("T")[0];
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
      console.log('⏭️  Skipping commission auto-update for existing policy');
      return;
    }

    if (formData.productId && compGuideData) {
      console.log('💰 Auto-setting commission from comp_guide', compGuideData.commission_percentage * 100);
      // Use comp_guide commission rate (contract-level based)
      setFormData((prev) => ({
        ...prev,
        commissionPercentage: compGuideData.commission_percentage * 100, // Convert decimal to percentage
      }));
    } else if (formData.productId && !compGuideData) {
      // Fallback to product commission rate
      const selectedProduct = products.find((p) => p.id === formData.productId);
      console.log('💰 Auto-setting commission from product', selectedProduct?.commission_percentage ? selectedProduct.commission_percentage * 100 : 0);
      setFormData((prev) => ({
        ...prev,
        commissionPercentage: selectedProduct?.commission_percentage
          ? selectedProduct.commission_percentage * 100
          : 0,
      }));
    }
  }, [formData.productId, compGuideData, products, policyId]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = e.target;

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
    // Handle other fields
    else {
      setFormData((prev) => ({
        ...prev,
        [name]: ["clientAge", "premium"].includes(name)
          ? parseFloat(value) || 0
          : value,
      }));
    }

    // Clear error when user types
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
    if (!formData.submitDate)
      newErrors.submitDate = "Submit date is required";
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
    <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 overflow-y-auto">
        {/* Left Column - Client Information */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-900 m-0 mb-2 pb-2 border-b border-gray-200">Client Information</h3>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-gray-700">Client Name *</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              className={`py-1.5 px-2.5 border rounded-md text-[13px] bg-white transition-colors outline-none ${
                errors.clientName
                  ? "border-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              }`}
              placeholder="John Smith"
            />
            {errors.clientName && (
              <span className="text-[11px] text-red-500 mt-0.5">{errors.clientName}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-gray-700">State *</label>
              <select
                name="clientState"
                value={formData.clientState}
                onChange={handleInputChange}
                className={`py-1.5 px-2.5 border rounded-md text-[13px] bg-white transition-colors outline-none ${
                  errors.clientState
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                }`}
              >
                <option value="">Select</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              {errors.clientState && (
                <span className="text-[11px] text-red-500 mt-0.5">{errors.clientState}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-gray-700">Age *</label>
              <input
                type="number"
                name="clientAge"
                value={formData.clientAge || ""}
                onChange={handleInputChange}
                className={`py-1.5 px-2.5 border rounded-md text-[13px] bg-white transition-colors outline-none ${
                  errors.clientAge
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                }`}
                placeholder="45"
                min="1"
                max="120"
              />
              {errors.clientAge && (
                <span className="text-[11px] text-red-500 mt-0.5">{errors.clientAge}</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-gray-700">Carrier *</label>
            <select
              name="carrierId"
              value={formData.carrierId}
              onChange={handleInputChange}
              className={`py-1.5 px-2.5 border rounded-md text-[13px] bg-white transition-colors outline-none ${
                errors.carrierId
                  ? "border-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              }`}
            >
              <option value="">Select Carrier</option>
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
            {errors.carrierId && (
              <span className="text-[11px] text-red-500 mt-0.5">{errors.carrierId}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-gray-700">Product *</label>
            <select
              name="productId"
              value={formData.productId}
              onChange={handleInputChange}
              className={`py-1.5 px-2.5 border rounded-md text-[13px] bg-white transition-colors outline-none ${
                errors.productId
                  ? "border-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              }`}
              disabled={!formData.carrierId || productsLoading}
            >
              <option value="">
                {!formData.carrierId
                  ? "Select a carrier first"
                  : productsLoading
                    ? "Loading products..."
                    : products.length === 0
                      ? "No products available for this carrier"
                      : "Select Product"}
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {productCommissionRates[product.id] &&
                    ` (${(productCommissionRates[product.id] * 100).toFixed(1)}% commission)`}
                </option>
              ))}
            </select>
            {errors.productId && (
              <span className="text-[11px] text-red-500 mt-0.5">{errors.productId}</span>
            )}
            {formData.carrierId &&
              !productsLoading &&
              products.length === 0 && (
                <span className="text-[11px] text-red-500 mt-0.5">
                  ⚠️ This carrier has no products configured. Please contact
                  admin or select a different carrier.
                </span>
              )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-gray-700">Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Optional notes..."
              className="py-1.5 px-2.5 border border-gray-300 rounded-md text-[13px] bg-white transition-colors outline-none resize-vertical min-h-[60px] focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
            />
          </div>
        </div>

        {/* Right Column - Policy Details */}
        <div className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-gray-900 m-0 mb-2 pb-2 border-b border-gray-200">Policy Details</h3>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-gray-700">Policy Number *</label>
            <input
              type="text"
              name="policyNumber"
              value={formData.policyNumber}
              onChange={handleInputChange}
              className={`py-1.5 px-2.5 border rounded-md text-[13px] bg-white transition-colors outline-none ${
                errors.policyNumber
                  ? "border-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              }`}
              placeholder="POL-123456"
            />
            {errors.policyNumber && (
              <span className="text-[11px] text-red-500 mt-0.5">{errors.policyNumber}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-gray-700">Submit Date *</label>
            <input
              type="date"
              name="submitDate"
              value={formData.submitDate}
              onChange={handleInputChange}
              className={`py-1.5 px-2.5 border rounded-md text-[13px] bg-white transition-colors outline-none ${
                errors.submitDate
                  ? "border-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              }`}
            />
            {errors.submitDate && (
              <span className="text-[11px] text-red-500 mt-0.5">{errors.submitDate}</span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-gray-700">Effective Date *</label>
            <input
              type="date"
              name="effectiveDate"
              value={formData.effectiveDate}
              onChange={handleInputChange}
              className={`py-1.5 px-2.5 border rounded-md text-[13px] bg-white transition-colors outline-none ${
                errors.effectiveDate
                  ? "border-red-500"
                  : "border-gray-300 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              }`}
            />
            {errors.effectiveDate && (
              <span className="text-[11px] text-red-500 mt-0.5">{errors.effectiveDate}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-gray-700">Premium Amount *</label>
              <input
                type="number"
                name="premium"
                value={formData.premium || ""}
                onChange={handleInputChange}
                className={`py-1.5 px-2.5 border rounded-md text-[13px] bg-white transition-colors outline-none ${
                  errors.premium
                    ? "border-red-500"
                    : "border-gray-300 focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
                }`}
                placeholder="250.00"
                step="0.01"
                min="0"
              />
              {errors.premium && (
                <span className="text-[11px] text-red-500 mt-0.5">{errors.premium}</span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[13px] font-medium text-gray-700">Payment Frequency *</label>
              <select
                name="paymentFrequency"
                value={formData.paymentFrequency}
                onChange={handleInputChange}
                className="py-1.5 px-2.5 border border-gray-300 rounded-md text-[13px] bg-white transition-colors outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[13px] font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="py-1.5 px-2.5 border border-gray-300 rounded-md text-[13px] bg-white transition-colors outline-none focus:border-blue-500 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.1)]"
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="lapsed">Lapsed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Calculated Values */}
          <div className="flex flex-col gap-2 p-3 bg-gray-50 rounded-md border border-gray-200">
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-600">Annual Premium:</span>
              <strong className="text-gray-900">${annualPremium.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-600">Commission Rate:</span>
              <strong className="text-gray-900">{formData.commissionPercentage.toFixed(2)}%</strong>
            </div>
            <div className="flex justify-between items-center text-[13px]">
              <span className="text-gray-600">Expected Advance (9 months):</span>
              <strong className="text-green-600">
                ${expectedCommission.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 p-4 px-6 border-t border-gray-200 bg-gray-50">
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
