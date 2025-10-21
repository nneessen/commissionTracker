// PolicyFormUpdated.tsx - Updated version that uses real products from database
import React, { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useCarriers } from "../../hooks/carriers";
import { useProducts } from "../../hooks/products/useProducts";
import { useCommissionRate } from "../../hooks/commissions/useCommissionRate";
import {
  NewPolicyForm,
  PolicyStatus,
  PaymentFrequency,
  Policy,
} from "../../types/policy.types";
import { ProductType } from "../../types/commission.types";
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
  addPolicy: (form: NewPolicyForm) => Policy | null;
  updatePolicy: (id: string, updates: any) => void;
  getPolicyById: (id: string) => Policy | undefined;
}

const US_STATES = [
  { value: "AL", label: "AL" }, { value: "AK", label: "AK" }, { value: "AZ", label: "AZ" },
  { value: "AR", label: "AR" }, { value: "CA", label: "CA" }, { value: "CO", label: "CO" },
  { value: "CT", label: "CT" }, { value: "DE", label: "DE" }, { value: "FL", label: "FL" },
  { value: "GA", label: "GA" }, { value: "HI", label: "HI" }, { value: "ID", label: "ID" },
  { value: "IL", label: "IL" }, { value: "IN", label: "IN" }, { value: "IA", label: "IA" },
  { value: "KS", label: "KS" }, { value: "KY", label: "KY" }, { value: "LA", label: "LA" },
  { value: "ME", label: "ME" }, { value: "MD", label: "MD" }, { value: "MA", label: "MA" },
  { value: "MI", label: "MI" }, { value: "MN", label: "MN" }, { value: "MS", label: "MS" },
  { value: "MO", label: "MO" }, { value: "MT", label: "MT" }, { value: "NE", label: "NE" },
  { value: "NV", label: "NV" }, { value: "NH", label: "NH" }, { value: "NJ", label: "NJ" },
  { value: "NM", label: "NM" }, { value: "NY", label: "NY" }, { value: "NC", label: "NC" },
  { value: "ND", label: "ND" }, { value: "OH", label: "OH" }, { value: "OK", label: "OK" },
  { value: "OR", label: "OR" }, { value: "PA", label: "PA" }, { value: "RI", label: "RI" },
  { value: "SC", label: "SC" }, { value: "SD", label: "SD" }, { value: "TN", label: "TN" },
  { value: "TX", label: "TX" }, { value: "UT", label: "UT" }, { value: "VT", label: "VT" },
  { value: "VA", label: "VA" }, { value: "WA", label: "WA" }, { value: "WV", label: "WV" },
  { value: "WI", label: "WI" }, { value: "WY", label: "WY" },
];

// Map product type for backward compatibility
function getProductTypeFromName(productName: string): ProductType {
  const name = productName.toLowerCase();
  if (name.includes('term')) return 'term_life';
  if (name.includes('whole') || name.includes('wl')) return 'whole_life';
  if (name.includes('universal') || name.includes('ul')) return 'universal_life';
  if (name.includes('variable')) return 'variable_life';
  if (name.includes('health') || name.includes('accident')) return 'health';
  if (name.includes('disability')) return 'disability';
  if (name.includes('annuity')) return 'annuity';
  return 'other';
}

export const PolicyFormUpdated: React.FC<PolicyFormProps> = ({
  policyId,
  onClose,
  addPolicy,
  updatePolicy,
  getPolicyById,
}) => {
  const { data: carriers = [] } = useCarriers();
  const { user } = useAuth();

  // Get agent's contract level (default to 100 if not set)
  const contractLevel = user?.contractCompLevel || 100;

  // Extended form data to include productId
  interface ExtendedPolicyForm extends NewPolicyForm {
    productId?: string;
  }

  const [formData, setFormData] = useState<ExtendedPolicyForm>({
    clientName: "",
    clientState: "",
    clientAge: 0,
    clientEmail: "",
    clientPhone: "",
    carrierId: "",
    productId: "", // NEW: Actual product selection
    product: "term_life" as ProductType, // Keep for backward compatibility
    policyNumber: "",
    effectiveDate: new Date().toISOString().split("T")[0],
    premium: 0,
    paymentFrequency: "monthly" as PaymentFrequency,
    commissionPercentage: 0,
    status: "pending" as PolicyStatus,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch products for selected carrier
  const { data: products = [], isLoading: productsLoading } = useProducts(formData.carrierId);

  // Fetch commission rate for selected product and agent's contract level
  const { data: commissionRate, isLoading: rateLoading } = useCommissionRate(
    formData.productId,
    contractLevel
  );

  // Update commission percentage when rate loads
  useEffect(() => {
    if (commissionRate !== null && commissionRate !== undefined) {
      setFormData(prev => ({
        ...prev,
        commissionPercentage: commissionRate
      }));
    }
  }, [commissionRate]);

  // Load existing policy data if editing
  useEffect(() => {
    if (policyId) {
      const policy = getPolicyById(policyId);
      if (policy) {
        setFormData({
          clientName: policy.client.name,
          clientState: policy.client.state,
          clientAge: policy.client.age,
          clientEmail: policy.client.email || "",
          clientPhone: policy.client.phone || "",
          carrierId: policy.carrierId,
          productId: policy.productId || "", // Use actual productId if available
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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;

    // Handle carrier change - reset product selection
    if (name === 'carrierId') {
      setFormData(prev => ({
        ...prev,
        carrierId: value,
        productId: '', // Reset product when carrier changes
        product: 'term_life' as ProductType,
      }));
    }
    // Handle product change
    else if (name === 'productId') {
      const selectedProduct = products.find(p => p.id === value);
      setFormData(prev => ({
        ...prev,
        productId: value,
        product: selectedProduct
          ? getProductTypeFromName(selectedProduct.name)
          : 'term_life' as ProductType,
      }));
    }
    // Handle other fields
    else {
      setFormData(prev => ({
        ...prev,
        [name]: ["clientAge", "premium", "commissionPercentage"].includes(name)
          ? parseFloat(value) || 0
          : value,
      }));
    }

    // Clear error for the field being changed
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName) {
      newErrors.clientName = "Client name is required";
    }
    if (!formData.clientState) {
      newErrors.clientState = "State is required";
    }
    if (formData.clientAge <= 0 || formData.clientAge > 120) {
      newErrors.clientAge = "Valid age is required (1-120)";
    }
    if (!formData.carrierId) {
      newErrors.carrierId = "Carrier is required";
    }
    if (!formData.productId) {
      newErrors.productId = "Product is required";
    }
    if (!formData.policyNumber) {
      newErrors.policyNumber = "Policy number is required";
    }
    if (!formData.effectiveDate) {
      newErrors.effectiveDate = "Effective date is required";
    }

    const premiumError = validatePremium(formData.premium);
    if (premiumError) {
      newErrors.premium = premiumError;
    }

    const commissionError = validateCommissionPercentage(formData.commissionPercentage);
    if (commissionError) {
      newErrors.commissionPercentage = commissionError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const submitData: NewPolicyForm = {
      ...formData,
      annualPremium: calculateAnnualPremium(formData.premium, formData.paymentFrequency),
    };

    if (policyId) {
      updatePolicy(policyId, submitData);
    } else {
      addPolicy(submitData);
    }
    onClose();
  };

  const annualPremium = calculateAnnualPremium(formData.premium, formData.paymentFrequency);
  const expectedCommission = calculateExpectedCommission(annualPremium, formData.commissionPercentage);

  return (
    <div className="policy-form">
      <div className="modal-header">
        <h2>{policyId ? "Edit Policy" : "New Policy"}</h2>
        <Button variant="ghost" size="icon" className="close-btn" onClick={onClose}>
          ×
        </Button>
      </div>

      <div className="form-content">
        {/* Left Column - Client & Product Info */}
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
            <label>Email</label>
            <input
              type="email"
              name="clientEmail"
              value={formData.clientEmail}
              onChange={handleInputChange}
              placeholder="john@example.com"
            />
          </div>

          <div className="form-group">
            <label>Phone</label>
            <input
              type="tel"
              name="clientPhone"
              value={formData.clientPhone}
              onChange={handleInputChange}
              placeholder="(555) 123-4567"
            />
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
                  : "Select Product"}
              </option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.commission_percentage &&
                    ` (${(product.commission_percentage * 100).toFixed(1)}% commission)`}
                </option>
              ))}
            </select>
            {errors.productId && (
              <span className="error-msg">{errors.productId}</span>
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
              {formData.premium > 0 && (
                <div className="text-sm text-muted-foreground mt-1">
                  Annual Premium: ${annualPremium.toFixed(2)}
                </div>
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

          <div className="form-row">
            <div className="form-group">
              <label>Commission % *</label>
              <input
                type="number"
                name="commissionPercentage"
                value={formData.commissionPercentage || ""}
                onChange={handleInputChange}
                className={errors.commissionPercentage ? "error" : ""}
                placeholder="50"
                step="0.1"
                min="0"
                max="200"
                readOnly={!!commissionRate && !policyId}
              />
              {errors.commissionPercentage && (
                <span className="error-msg">{errors.commissionPercentage}</span>
              )}
              {rateLoading && (
                <div className="text-sm text-muted-foreground mt-1">
                  Loading commission rate...
                </div>
              )}
              {commissionRate && !rateLoading && (
                <div className="text-sm text-success mt-1">
                  ✓ Rate for contract level {contractLevel}: {commissionRate.toFixed(1)}%
                </div>
              )}
              {!formData.productId && !rateLoading && (
                <div className="text-sm text-muted-foreground mt-1">
                  Select a product to load commission rate
                </div>
              )}
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
          </div>

          {/* Calculated Values */}
          <div className="calculated-values">
            <div className="calc-row">
              <span>Annual Premium:</span>
              <strong>${annualPremium.toFixed(2)}</strong>
            </div>
            <div className="calc-row">
              <span>Commission Rate:</span>
              <strong>{formData.commissionPercentage.toFixed(1)}%</strong>
            </div>
            <div className="calc-row">
              <span>Expected Commission:</span>
              <strong className="commission">
                ${expectedCommission.toFixed(2)}
              </strong>
            </div>
            {formData.productId && (
              <div className="calc-row text-xs text-muted-foreground mt-2">
                <span>Contract Level:</span>
                <span>{contractLevel}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="modal-footer">
        <Button variant="outline" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSubmit}>
          {policyId ? "Update Policy" : "Submit Policy"}
        </Button>
      </div>
    </div>
  );
};