// src/features/settings/ConstantsManagement.tsx
import React, { useState } from 'react';
import { useConstants, useUpdateConstant } from '../../hooks/expenses/useConstants';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/Input';
import { AlertCircle, CheckCircle, Settings, DollarSign } from 'lucide-react';

export const ConstantsManagement: React.FC = () => {
  const { data: constants, isLoading } = useConstants();
  const updateConstant = useUpdateConstant();

  const [formData, setFormData] = useState({
    avgAP: constants?.avgAP || 0,
    target1: constants?.target1 || 0,
    target2: constants?.target2 || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Update form when constants load
  React.useEffect(() => {
    if (constants) {
      setFormData({
        avgAP: constants.avgAP,
        target1: constants.target1,
        target2: constants.target2,
      });
    }
  }, [constants]);

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    const numValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
    setFormData(prev => ({ ...prev, [field]: numValue }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setSuccessMessage('');
  };

  const validateAndSave = async (field: 'avgAP' | 'target1' | 'target2') => {
    const value = formData[field];

    // Validation
    if (value < 0) {
      setErrors(prev => ({ ...prev, [field]: 'Value cannot be negative' }));
      return;
    }

    try {
      await updateConstant.mutateAsync({ field, value });
      setSuccessMessage(`${getFieldLabel(field)} updated successfully!`);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        [field]: error instanceof Error ? error.message : 'Failed to update'
      }));
    }
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      avgAP: 'Average Annual Premium',
      target1: 'Monthly Income Target #1',
      target2: 'Monthly Income Target #2',
    };
    return labels[field] || field;
  };

  const getFieldDescription = (field: string): string => {
    const descriptions: Record<string, string> = {
      avgAP: 'Your expected average annual premium per policy. Used for pace calculations and dashboard comparisons.',
      target1: 'Your first monthly income goal (used in breakeven calculations).',
      target2: 'Your second monthly income goal (used in breakeven calculations).',
    };
    return descriptions[field] || '';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading constants...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Settings className="h-6 w-6 text-blue-600 mt-1" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">System Constants</h2>
          <p className="text-sm text-gray-600 mt-1">
            Configure default values used throughout the application for calculations and comparisons.
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm text-green-800">{successMessage}</span>
        </div>
      )}

      {/* Constants Form */}
      <div className="grid gap-6">
        {/* Average Annual Premium */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <DollarSign className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                {getFieldLabel('avgAP')}
              </label>
              <p className="text-xs text-gray-600 mb-3">{getFieldDescription('avgAP')}</p>

              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={formData.avgAP}
                    onChange={(value) => handleInputChange('avgAP', value)}
                    onBlur={() => validateAndSave('avgAP')}
                    min={0}
                    step={100}
                    className={errors.avgAP ? 'border-red-500' : ''}
                  />
                  {errors.avgAP && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors.avgAP}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => validateAndSave('avgAP')}
                  disabled={updateConstant.isPending}
                  size="sm"
                >
                  {updateConstant.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Target 1 */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                {getFieldLabel('target1')}
              </label>
              <p className="text-xs text-gray-600 mb-3">{getFieldDescription('target1')}</p>

              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={formData.target1}
                    onChange={(value) => handleInputChange('target1', value)}
                    onBlur={() => validateAndSave('target1')}
                    min={0}
                    step={100}
                    className={errors.target1 ? 'border-red-500' : ''}
                  />
                  {errors.target1 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors.target1}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => validateAndSave('target1')}
                  disabled={updateConstant.isPending}
                  size="sm"
                >
                  {updateConstant.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Target 2 */}
        <div className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm">
          <div className="flex items-start gap-3 mb-4">
            <DollarSign className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <label className="block text-sm font-semibold text-gray-900 mb-1">
                {getFieldLabel('target2')}
              </label>
              <p className="text-xs text-gray-600 mb-3">{getFieldDescription('target2')}</p>

              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <Input
                    type="number"
                    value={formData.target2}
                    onChange={(value) => handleInputChange('target2', value)}
                    onBlur={() => validateAndSave('target2')}
                    min={0}
                    step={100}
                    className={errors.target2 ? 'border-red-500' : ''}
                  />
                  {errors.target2 && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      {errors.target2}
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => validateAndSave('target2')}
                  disabled={updateConstant.isPending}
                  size="sm"
                >
                  {updateConstant.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">How These Values Are Used</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li><strong>Avg Annual Premium:</strong> Appears on dashboard for comparison and used in pace calculations</li>
              <li><strong>Monthly Targets:</strong> Used in financial breakeven analysis and goal tracking</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
