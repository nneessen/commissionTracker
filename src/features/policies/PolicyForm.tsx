// /home/nneessen/projects/commissionTracker/src/features/policies/PolicyForm.tsx

import React, { useState, useEffect } from 'react';
import { useCarriers } from '../../hooks/useCarriers';
import { NewPolicyForm, PolicyStatus, PaymentFrequency, Policy } from '../../types/policy.types';
import { ProductType } from '../../types/commission.types';

import {
  calculateAnnualPremium,
  calculatePaymentAmount,
  calculateExpectedCommission,
  validatePremium,
  validateCommissionPercentage
} from '../../utils/policyCalculations';

interface PolicyFormProps {
  policyId?: string;
  onClose: () => void;
  addPolicy: (form: NewPolicyForm) => Policy | null;
  updatePolicy: (id: string, updates: any) => void;
  getPolicyById: (id: string) => Policy | undefined;
}

const US_STATES = [
  { value: 'AL', label: 'AL' }, { value: 'AK', label: 'AK' }, { value: 'AZ', label: 'AZ' },
  { value: 'AR', label: 'AR' }, { value: 'CA', label: 'CA' }, { value: 'CO', label: 'CO' },
  { value: 'CT', label: 'CT' }, { value: 'DE', label: 'DE' }, { value: 'FL', label: 'FL' },
  { value: 'GA', label: 'GA' }, { value: 'HI', label: 'HI' }, { value: 'ID', label: 'ID' },
  { value: 'IL', label: 'IL' }, { value: 'IN', label: 'IN' }, { value: 'IA', label: 'IA' },
  { value: 'KS', label: 'KS' }, { value: 'KY', label: 'KY' }, { value: 'LA', label: 'LA' },
  { value: 'ME', label: 'ME' }, { value: 'MD', label: 'MD' }, { value: 'MA', label: 'MA' },
  { value: 'MI', label: 'MI' }, { value: 'MN', label: 'MN' }, { value: 'MS', label: 'MS' },
  { value: 'MO', label: 'MO' }, { value: 'MT', label: 'MT' }, { value: 'NE', label: 'NE' },
  { value: 'NV', label: 'NV' }, { value: 'NH', label: 'NH' }, { value: 'NJ', label: 'NJ' },
  { value: 'NM', label: 'NM' }, { value: 'NY', label: 'NY' }, { value: 'NC', label: 'NC' },
  { value: 'ND', label: 'ND' }, { value: 'OH', label: 'OH' }, { value: 'OK', label: 'OK' },
  { value: 'OR', label: 'OR' }, { value: 'PA', label: 'PA' }, { value: 'RI', label: 'RI' },
  { value: 'SC', label: 'SC' }, { value: 'SD', label: 'SD' }, { value: 'TN', label: 'TN' },
  { value: 'TX', label: 'TX' }, { value: 'UT', label: 'UT' }, { value: 'VT', label: 'VT' },
  { value: 'VA', label: 'VA' }, { value: 'WA', label: 'WA' }, { value: 'WV', label: 'WV' },
  { value: 'WI', label: 'WI' }, { value: 'WY', label: 'WY' },
];

export const PolicyForm: React.FC<PolicyFormProps> = ({
  policyId,
  onClose,
  addPolicy,
  updatePolicy,
  getPolicyById
}) => {
  const { carriers } = useCarriers();

  const [formData, setFormData] = useState<NewPolicyForm>({
    clientName: '',
    clientState: '',
    clientAge: 0,
    carrierId: '',
    product: 'term_life' as ProductType,
    policyNumber: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    premium: 0,
    paymentFrequency: 'monthly' as PaymentFrequency,
    commissionPercentage: 0,
    status: 'pending' as PolicyStatus,
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

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
          effectiveDate: policy.effectiveDate instanceof Date ? policy.effectiveDate.toISOString().split('T')[0] : policy.effectiveDate,
          premium: calculatePaymentAmount(policy.annualPremium, policy.paymentFrequency),
          paymentFrequency: policy.paymentFrequency,
          commissionPercentage: policy.commissionPercentage,
          status: policy.status,
          notes: policy.notes || '',
        });
      }
    }
  }, [policyId, getPolicyById]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: ['clientAge', 'premium', 'commissionPercentage'].includes(name)
        ? parseFloat(value) || 0
        : value
    }));
    // Clear error when user types
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName) newErrors.clientName = 'Client name is required';
    if (!formData.clientState) newErrors.clientState = 'State is required';
    if (!formData.clientAge || formData.clientAge < 1 || formData.clientAge > 120) {
      newErrors.clientAge = 'Valid age is required (1-120)';
    }
    if (!formData.carrierId) newErrors.carrierId = 'Carrier is required';
    if (!formData.policyNumber) newErrors.policyNumber = 'Policy number is required';
    if (!formData.effectiveDate) newErrors.effectiveDate = 'Effective date is required';
    
    if (!validatePremium(formData.premium)) {
      newErrors.premium = 'Premium must be greater than $0';
    }
    
    if (!validateCommissionPercentage(formData.commissionPercentage)) {
      newErrors.commissionPercentage = 'Commission must be between 0-200%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validateForm()) {
      // Calculate annual premium before submitting
      const annualPremium = calculateAnnualPremium(formData.premium, formData.paymentFrequency);

      const submissionData = {
        ...formData,
        annualPremium
      };

      try {
        if (policyId) {
          updatePolicy(policyId, submissionData);
        } else {
          addPolicy(submissionData);
        }
        onClose();
      } catch (error) {
        alert(`Error: ${error instanceof Error ? error.message : 'Failed to save policy'}`);
      }
    }
  };

  // Calculate display values
  const annualPremium = calculateAnnualPremium(formData.premium, formData.paymentFrequency);
  const expectedCommission = calculateExpectedCommission(annualPremium, formData.commissionPercentage);

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
              className={errors.clientName ? 'error' : ''}
              placeholder="John Smith"
            />
            {errors.clientName && <span className="error-msg">{errors.clientName}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>State *</label>
              <select
                name="clientState"
                value={formData.clientState}
                onChange={handleInputChange}
                className={errors.clientState ? 'error' : ''}
              >
                <option value="">Select</option>
                {US_STATES.map(state => (
                  <option key={state.value} value={state.value}>{state.label}</option>
                ))}
              </select>
              {errors.clientState && <span className="error-msg">{errors.clientState}</span>}
            </div>
            <div className="form-group">
              <label>Age *</label>
              <input
                type="number"
                name="clientAge"
                value={formData.clientAge || ''}
                onChange={handleInputChange}
                className={errors.clientAge ? 'error' : ''}
                placeholder="45"
                min="1"
                max="120"
              />
              {errors.clientAge && <span className="error-msg">{errors.clientAge}</span>}
            </div>
          </div>

          <div className="form-group">
            <label>Carrier *</label>
            <select
              name="carrierId"
              value={formData.carrierId}
              onChange={handleInputChange}
              className={errors.carrierId ? 'error' : ''}
            >
              <option value="">Select Carrier</option>
              {carriers.map(carrier => (
                <option key={carrier.id} value={carrier.id}>{carrier.name}</option>
              ))}
            </select>
            {errors.carrierId && <span className="error-msg">{errors.carrierId}</span>}
          </div>

          <div className="form-group">
            <label>Product Type *</label>
            <select
              name="product"
              value={formData.product}
              onChange={handleInputChange}
            >
              <option value="whole_life">Whole Life</option>
              <option value="term_life">Term Life</option>
              <option value="universal_life">Universal Life</option>
              <option value="indexed_universal_life">IUL</option>
              <option value="accidental_life">Accidental</option>
            </select>
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
              className={errors.policyNumber ? 'error' : ''}
              placeholder="POL-123456"
            />
            {errors.policyNumber && <span className="error-msg">{errors.policyNumber}</span>}
          </div>

          <div className="form-group">
            <label>Effective Date *</label>
            <input
              type="date"
              name="effectiveDate"
              value={formData.effectiveDate}
              onChange={handleInputChange}
              className={errors.effectiveDate ? 'error' : ''}
            />
            {errors.effectiveDate && <span className="error-msg">{errors.effectiveDate}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Premium Amount *</label>
              <input
                type="number"
                name="premium"
                value={formData.premium || ''}
                onChange={handleInputChange}
                className={errors.premium ? 'error' : ''}
                placeholder="250.00"
                step="0.01"
                min="0"
              />
              {errors.premium && <span className="error-msg">{errors.premium}</span>}
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
                value={formData.commissionPercentage || ''}
                onChange={handleInputChange}
                className={errors.commissionPercentage ? 'error' : ''}
                placeholder="50"
                step="0.1"
                min="0"
                max="200"
              />
              {errors.commissionPercentage && <span className="error-msg">{errors.commissionPercentage}</span>}
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
              <span>Expected Commission:</span>
              <strong className="commission">${expectedCommission.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onClose} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" className="btn-primary">
          {policyId ? 'Update Policy' : 'Add Policy'}
        </button>
      </div>
    </form>
  );
};