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
  updatePolicy: (id: string, updates: any) => Promise<void>;
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

  const userContractLevel =
    user?.raw_user_meta_data?.contract_comp_level || 100;

  const [formData, setFormData] = useState<NewPolicyForm>({
    clientName: "",
    clientState: "",
    clientAge: 0,
    carrierId: "",
    productId: "", // Use productId to link to products table
    product: "term_life" as ProductType,
    policyNumber: "",
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
    formData.productId,
    userContractLevel,
  );

  console.log(
    "🔍 DEBUG: compGuideData =",
    compGuideData,
    "for productId =",
    formData.productId,
    "contractLevel =",
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
          product: policy.product,
          policyNumber: policy.policyNumber,
          effectiveDate:
            policy.effectiveDate instanceof Date
              ? policy.effectiveDate.toISOString().split("T")[0]
              : policy.effectiveDate,
          premium: calculatePaymentAmount(
            policy.annualPremium,
            policy.paymentFrequency,
          ),
          paymentFrequency: policy.paymentFrequency,
          commissionPercentage: policy.commissionPercentage,
          status: policy.status,
          notes: policy.notes || "",
        });
      }
    }
  }, [policyId, getPolicyById]);

  // Fetch commission rates for all products when products change
  useEffect(() => {
    const fetchProductCommissionRates = async () => {
      if (products.length === 0) return;

      const today = new Date().toISOString().split("T")[0];
      const rates: Record<string, number> = {};

      console.log(
        "🔍 DEBUG: Fetching commission rates for",
        products.length,
        "products with contractLevel =",
        userContractLevel,
      );

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

        console.log(
          "🔍 DEBUG: Product",
          product.name,
          "- comp_guide:",
          data?.commission_percentage,
          "fallback:",
          product.commission_percentage,
          "final:",
          rates[product.id],
        );
      }

      setProductCommissionRates(rates);
    };

    fetchProductCommissionRates();
  }, [products, userContractLevel]);

  // Update commission percentage when comp_guide data changes or fallback to product commission
  useEffect(() => {
    if (formData.productId && compGuideData) {
      // Use comp_guide commission rate (contract-level based)
      console.log(
        "✅ Using comp_guide rate:",
        compGuideData.commission_percentage,
      );
      setFormData((prev) => ({
        ...prev,
        commissionPercentage: compGuideData.commission_percentage * 100, // Convert decimal to percentage
      }));
    } else if (formData.productId && !compGuideData) {
      // Fallback to product commission rate
      const selectedProduct = products.find((p) => p.id === formData.productId);
      console.log(
        "⚠️ Falling back to product rate:",
        selectedProduct?.commission_percentage,
      );
      setFormData((prev) => ({
        ...prev,
        commissionPercentage: selectedProduct?.commission_percentage
          ? selectedProduct.commission_percentage * 100
          : 0,
      }));
    }
  }, [formData.productId, compGuideData, products]);

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

  const handleSubmit = (e: React.FormEvent) => {
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
          updatePolicy(policyId, submissionData);
        } else {
          addPolicy(submissionData);
        }
        // Don't close immediately - let the mutation handler close on success
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
    <form onSubmit={handleSubmit} className="modal-form">
      <div className="form-columns">
        {/* Left Column - Client Information */}
        <div className="form-column">
          <h3>Client Information</h3>

          <div className="form-group">
            <label>Client Name *</label>
            <input
              type="text"
              name="clientName"
              value={formData.clientName}
              onChange={handleInputChange}
              className={errors.clientName ? "error" : ""}
              placeholder="John Smith"
            />
            {errors.clientName && (
              <span className="error-msg">{errors.clientName}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>State *</label>
              <select
                name="clientState"
                value={formData.clientState}
                onChange={handleInputChange}
                className={errors.clientState ? "error" : ""}
              >
                <option value="">Select</option>
                {US_STATES.map((state) => (
                  <option key={state.value} value={state.value}>
                    {state.label}
                  </option>
                ))}
              </select>
              {errors.clientState && (
                <span className="error-msg">{errors.clientState}</span>
              )}
            </div>
            <div className="form-group">
              <label>Age *</label>
              <input
                type="number"
                name="clientAge"
                value={formData.clientAge || ""}
                onChange={handleInputChange}
                className={errors.clientAge ? "error" : ""}
                placeholder="45"
                min="1"
                max="120"
              />
              {errors.clientAge && (
                <span className="error-msg">{errors.clientAge}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Carrier *</label>
            <select
              name="carrierId"
              value={formData.carrierId}
              onChange={handleInputChange}
              className={errors.carrierId ? "error" : ""}
            >
              <option value="">Select Carrier</option>
              {carriers.map((carrier) => (
                <option key={carrier.id} value={carrier.id}>
                  {carrier.name}
                </option>
              ))}
            </select>
            {errors.carrierId && (
              <span className="error-msg">{errors.carrierId}</span>
            )}
          </div>

          <div className="form-group">
            <label>Product *</label>
            <select
              name="productId"
              value={formData.productId}
              onChange={handleInputChange}
              className={errors.productId ? "error" : ""}
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
              <span className="error-msg">{errors.productId}</span>
            )}
            {formData.carrierId &&
              !productsLoading &&
              products.length === 0 && (
                <span className="error-msg" style={{ color: "#ff6b6b" }}>
                  ⚠️ This carrier has no products configured. Please contact
                  admin or select a different carrier.
                </span>
              )}
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="Optional notes..."
            />
          </div>
        </div>

        {/* Right Column - Policy Details */}
        <div className="form-column">
          <h3>Policy Details</h3>

          <div className="form-group">
            <label>Policy Number *</label>
            <input
              type="text"
              name="policyNumber"
              value={formData.policyNumber}
              onChange={handleInputChange}
              className={errors.policyNumber ? "error" : ""}
              placeholder="POL-123456"
            />
            {errors.policyNumber && (
              <span className="error-msg">{errors.policyNumber}</span>
            )}
          </div>

          <div className="form-group">
            <label>Effective Date *</label>
            <input
              type="date"
              name="effectiveDate"
              value={formData.effectiveDate}
              onChange={handleInputChange}
              className={errors.effectiveDate ? "error" : ""}
            />
            {errors.effectiveDate && (
              <span className="error-msg">{errors.effectiveDate}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Premium Amount *</label>
              <input
                type="number"
                name="premium"
                value={formData.premium || ""}
                onChange={handleInputChange}
                className={errors.premium ? "error" : ""}
                placeholder="250.00"
                step="0.01"
                min="0"
              />
              {errors.premium && (
                <span className="error-msg">{errors.premium}</span>
              )}
            </div>
            <div className="form-group">
              <label>Payment Frequency *</label>
              <select
                name="paymentFrequency"
                value={formData.paymentFrequency}
                onChange={handleInputChange}
              >
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="semi-annual">Semi-Annual</option>
                <option value="annual">Annual</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
            >
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="lapsed">Lapsed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Calculated Values */}
          <div className="calculated-values">
            <div className="calc-row">
              <span>Annual Premium:</span>
              <strong>${annualPremium.toFixed(2)}</strong>
            </div>
            <div className="calc-row">
              <span>Commission Rate:</span>
              <strong>{formData.commissionPercentage.toFixed(2)}%</strong>
            </div>
            <div className="calc-row">
              <span>Expected Advance (9 months):</span>
              <strong className="commission">
                ${expectedCommission.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {policyId ? "Update Policy" : "Add Policy"}
        </button>
      </div>
    </form>
  );
};
