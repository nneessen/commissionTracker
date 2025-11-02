// src/features/settings/ConstantsManagement.tsx
import React, { useState } from 'react';
import { useConstants, useUpdateConstant } from '../../hooks/expenses/useConstants';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { AlertCircle, CheckCircle, Settings, DollarSign } from 'lucide-react';

export const ConstantsManagement: React.FC = () => {
  const { data: constants, isLoading } = useConstants();
  const updateConstant = useUpdateConstant();

  const [formData, setFormData] = useState({
    avgAP: constants?.avgAP || 0,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Update form when constants load
  React.useEffect(() => {
    if (constants) {
      setFormData({
        avgAP: constants.avgAP,
      });
    }
  }, [constants]);

  const handleInputChange = (field: keyof typeof formData, value: string | number) => {
    const numValue = typeof value === 'number' ? value : (parseFloat(value) || 0);
    setFormData(prev => ({ ...prev, [field]: numValue }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setSuccessMessage('');
  };

  const validateAndSave = async (field: 'avgAP') => {
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
      avgAP: 'Average Annual Premium Override',
    };
    return labels[field] || field;
  };

  const getFieldDescription = (field: string): string => {
    const descriptions: Record<string, string> = {
      avgAP: 'Optional: Override the calculated average annual premium. This value will be used in targets calculations instead of your historical average. Leave at 0 to use automatic calculations.',
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
        <Settings className="h-6 w-6 text-primary mt-1" />
        <div>
          <h2 className="text-2xl font-bold text-foreground">System Constants</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Configure default values used throughout the application for calculations and comparisons.
          </p>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <Alert className="bg-status-active-bg border-status-active">
          <CheckCircle className="h-5 w-5 text-status-active" />
          <AlertDescription className="text-sm text-status-active">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {/* Constants Form */}
      <div className="grid gap-6">
        {/* Average Annual Premium */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start gap-3 mb-4">
              <DollarSign className="h-5 w-5 text-primary mt-0.5" />
              <div className="flex-1">
                <Label className="block text-sm font-semibold mb-1">
                  {getFieldLabel('avgAP')}
                </Label>
                <p className="text-xs text-muted-foreground mb-3">{getFieldDescription('avgAP')}</p>

                <div className="flex gap-3 items-start">
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={formData.avgAP}
                      onChange={(e) => handleInputChange('avgAP', e.target.value)}
                      onBlur={() => validateAndSave('avgAP')}
                      min={0}
                      step={100}
                      className={errors.avgAP ? 'border-destructive' : ''}
                    />
                    {errors.avgAP && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-destructive">
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
          </CardContent>
        </Card>

      </div>

      {/* Info Box */}
      <Alert className="bg-status-earned-bg border-status-earned">
        <AlertCircle className="h-5 w-5 text-status-earned" />
        <AlertDescription className="text-sm">
          <p className="font-semibold text-status-earned mb-1">About Premium Override</p>
          <p className="text-status-earned">
            By default, your targets are calculated using your actual historical average policy premium.
            Set a value here only if you want to override the automatic calculation. This is useful if you're
            planning to focus on different policy types or expect your average premium to change significantly.
          </p>
          <p className="text-status-earned mt-2 text-xs">
            Leave at 0 to use your actual historical average from your policy data.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
};
