import React, { useState } from 'react';
import { Button, Input } from '../../components/ui';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewCommissionForm, ProductType, SelectOption } from '../../types';
import { Carrier } from '../../types/carrier.types';
import { useCarriers, useCreateCommission } from '../../hooks';

interface CommissionFormProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRODUCT_OPTIONS: SelectOption[] = [
  { value: 'whole_life', label: 'Whole Life' },
  { value: 'term', label: 'Term Life' },
  { value: 'universal_life', label: 'Universal Life' },
  { value: 'indexed_universal_life', label: 'Indexed Universal Life' },
  { value: 'accidental', label: 'Accidental Death' },
  { value: 'final_expense', label: 'Final Expense' },
  { value: 'annuity', label: 'Annuity' },
];

const US_STATES: SelectOption[] = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

export const CommissionForm: React.FC<CommissionFormProps> = ({
  isOpen,
  onClose,
}) => {
  const { data: carriers = [] } = useCarriers();
  const { mutate: createCommission, isPending: isCreating, error } = useCreateCommission();

  const getCarrierById = (id: string) => carriers.find(c => c.id === id);
  const activeCarriers = carriers.filter(c => c.is_active);

  const [formData, setFormData] = useState<NewCommissionForm>({
    clientName: '',
    clientAge: 0,
    clientState: '',
    carrierId: '',
    product: 'whole_life',
    annualPremium: 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const carrierOptions: SelectOption[] = activeCarriers.map((carrier: Carrier) => ({
    value: carrier.id,
    label: carrier.name,
  }));

  const selectedCarrier = getCarrierById(formData.carrierId);
  // TODO: Update commission calculation to use new product/commission rate structure
  const estimatedCommission = 0; // Temporary - needs to be updated for new architecture

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.clientName.trim()) {
      newErrors.clientName = 'Client name is required';
    }

    if (!formData.clientAge || formData.clientAge < 1 || formData.clientAge > 120) {
      newErrors.clientAge = 'Valid age is required';
    }

    if (!formData.clientState) {
      newErrors.clientState = 'State is required';
    }

    if (!formData.carrierId) {
      newErrors.carrierId = 'Carrier is required';
    }

    if (!formData.annualPremium || formData.annualPremium <= 0) {
      newErrors.annualPremium = 'Annual premium must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // Transform form data to match CreateCommissionData structure
      const commissionData = {
        ...formData,
        client: {
          firstName: formData.clientName.split(' ')[0] || '',
          lastName: formData.clientName.split(' ').slice(1).join(' ') || '',
          state: formData.clientState,
        },
        userId: 'default-agent', // You may want to get this from a context or user state
        type: 'new_business', // Default type for new commissions
        status: 'pending',
        calculationBasis: 'annual_premium',
      };

      createCommission(commissionData as any, {
        onSuccess: () => {
          resetForm();
          onClose();
        }
      });
    }
  };

  const resetForm = () => {
    setFormData({
      clientName: '',
      clientAge: 0,
      clientState: '',
      carrierId: '',
      product: 'whole_life',
      annualPremium: 0,
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Log Commission</DialogTitle>
        </DialogHeader>
      <div className="space-y-4">
        {/* Client Information */}
        <div className="border-b pb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Client Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Client Name</label>
              <Input
                value={formData.clientName}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, clientName: e.target.value }))
                }
                required
              />
              {errors.clientName && (
                <p className="text-xs text-red-500">{errors.clientName}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Client Age</label>
              <Input
                type="number"
                value={formData.clientAge}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, clientAge: Number(e.target.value) }))
                }
                required
              />
              {errors.clientAge && (
                <p className="text-xs text-red-500">{errors.clientAge}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">State</label>
              <Select
                value={formData.clientState}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, clientState: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
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
                <p className="text-xs text-red-500">{errors.clientState}</p>
              )}
            </div>
          </div>
        </div>

        {/* Policy Information */}
        <div className="border-b pb-4">
          <h4 className="font-semibold text-gray-900 mb-3">Policy Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Carrier</label>
              <Select
                value={formData.carrierId}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, carrierId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select carrier" />
                </SelectTrigger>
                <SelectContent>
                  {carrierOptions.map((carrier) => (
                    <SelectItem key={carrier.value} value={carrier.value}>
                      {carrier.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.carrierId && (
                <p className="text-xs text-red-500">{errors.carrierId}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Product</label>
              <Select
                value={formData.product}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    product: value as ProductType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_OPTIONS.map((product) => (
                    <SelectItem key={product.value} value={product.value}>
                      {product.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Premium Information */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Premium Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Annual Premium</label>
              <Input
                type="number"
                value={formData.annualPremium}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, annualPremium: Number(e.target.value) }))
                }
                required
              />
              {errors.annualPremium && (
                <p className="text-xs text-red-500">{errors.annualPremium}</p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">
                Estimated Commission
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-lg font-semibold text-green-600">
                ${estimatedCommission.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              {selectedCarrier && (
                <p className="text-xs text-gray-500">
                  {/* TODO: Update to show commission rate from new structure */}
                  Rate: TBD
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="text-sm text-red-700">
              {error instanceof Error ? error.message : String(error)}
            </div>
          </div>
        )}

        {/* Actions */}
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isCreating}>
            {isCreating ? 'Adding...' : 'Add Commission'}
          </Button>
        </DialogFooter>
      </div>
      </DialogContent>
    </Dialog>
  );
};