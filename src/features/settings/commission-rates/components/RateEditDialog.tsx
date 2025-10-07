import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ProductWithRates, CONTRACT_LEVELS } from '../hooks/useCommissionRates';
import { compGuideService } from '@/services/settings/compGuideService';
import { CheckCircle2, XCircle } from 'lucide-react';

interface RateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductWithRates | null;
  onSave: (productId: string, rates: Record<number, number>) => void;
  isSaving?: boolean;
}

export function RateEditDialog({
  open,
  onOpenChange,
  product,
  onSave,
  isSaving = false,
}: RateEditDialogProps) {
  const [rates, setRates] = useState<Record<number, string>>({});
  const [rateIds, setRateIds] = useState<Record<number, string>>({});
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Load existing rates when product changes
  useEffect(() => {
    const loadRates = async () => {
      if (!product || !product.productId) return;

      setIsLoadingDetails(true);
      try {
        // Fetch full rate details to get IDs
        const { data } = await compGuideService.getEntriesByProduct(product.productId);

        const newRates: Record<number, string> = {};
        const newRateIds: Record<number, string> = {};

        if (data) {
          data.forEach((entry: any) => {
            const level = entry.contract_level;
            const percentage = entry.commission_percentage * 100; // Convert to percentage
            newRates[level] = percentage.toString();
            newRateIds[level] = entry.id;
          });
        }

        setRates(newRates);
        setRateIds(newRateIds);
      } catch (error) {
        console.error('Failed to load rates:', error);
      } finally {
        setIsLoadingDetails(false);
      }
    };

    if (open && product) {
      loadRates();
    } else {
      setRates({});
      setRateIds({});
    }
  }, [product, open]);

  const handleRateChange = (level: number, value: string) => {
    setRates(prev => ({ ...prev, [level]: value }));
  };

  const handleFillAll = () => {
    const value = prompt('Enter commission percentage to apply to all levels (0-100):');
    if (!value) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 100) {
      alert('Please enter a valid percentage between 0 and 100');
      return;
    }

    const newRates: Record<number, string> = {};
    CONTRACT_LEVELS.forEach(level => {
      newRates[level] = value;
    });
    setRates(newRates);
  };

  const handleClearAll = () => {
    if (!confirm('Clear all commission rates? This will not delete saved rates until you click Save.')) return;
    setRates({});
  };

  const handleSave = () => {
    if (!product) return;

    // Convert string rates to numbers and validate
    const validRates: Record<number, number> = {};
    let hasError = false;

    Object.entries(rates).forEach(([level, value]) => {
      if (!value.trim()) return; // Skip empty values

      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue < 0 || numValue > 100) {
        alert(`Invalid rate for level ${level}%: must be between 0 and 100`);
        hasError = true;
        return;
      }

      validRates[Number(level)] = numValue;
    });

    if (hasError) return;

    onSave(product.productId, validRates);
  };

  if (!product) return null;

  const filledCount = Object.keys(rates).filter(k => rates[Number(k)]?.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Edit Commission Rates</DialogTitle>
          <DialogDescription>
            Set commission percentages for each contract level
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{product.productName}</h3>
                <p className="text-sm text-muted-foreground">{product.carrierName}</p>
              </div>
              <div className="text-right">
                <Badge variant="outline">{product.productType.replace('_', ' ')}</Badge>
                <p className="text-sm text-muted-foreground mt-1">
                  {filledCount}/{CONTRACT_LEVELS.length} levels set
                </p>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleFillAll}>
              Fill All
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleClearAll}>
              Clear All
            </Button>
          </div>

          <Separator />

          {/* Rates Grid */}
          <ScrollArea className="h-[400px] rounded-md border p-4">
            {isLoadingDetails ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading rates...
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {CONTRACT_LEVELS.map((level) => {
                  const hasValue = rates[level]?.trim();
                  const value = rates[level] || '';

                  return (
                    <div
                      key={level}
                      className={`flex items-center gap-3 rounded-lg border p-3 ${
                        hasValue ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        {hasValue ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className="font-medium text-sm w-12">
                          {level}%
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={value}
                          onChange={(val) => handleRateChange(level, String(val))}
                          placeholder="0.0"
                          className="h-9 w-24 text-right"
                        />
                        <span className="text-sm text-muted-foreground">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isLoadingDetails}>
            {isSaving ? 'Saving...' : 'Save Rates'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
