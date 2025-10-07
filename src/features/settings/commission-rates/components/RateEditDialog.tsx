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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProductWithRates, CONTRACT_LEVELS } from '../hooks/useCommissionRates';
import { compGuideService } from '@/services/settings/compGuideService';
import { capitalizeWords } from '@/utils/stringUtils';

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
            // Fix floating-point precision issues by rounding to 2 decimal places
            newRates[level] = percentage.toFixed(2);
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
    const value = prompt('Enter commission percentage to apply to all levels (0-200):');
    if (!value) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 200) {
      alert('Please enter a valid percentage between 0 and 200');
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
      if (isNaN(numValue) || numValue < 0 || numValue > 200) {
        alert(`Invalid rate for level ${level}%: must be between 0 and 200`);
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit Commission Rates</DialogTitle>
          <DialogDescription>
            Set commission percentages for each contract level
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Info */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div>
                <span className="font-semibold">{product.productName}</span>
                <span className="text-muted-foreground"> - {product.carrierName}</span>
              </div>
              <Badge variant="outline" className="text-xs">
                {capitalizeWords(product.productType)}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {filledCount}/{CONTRACT_LEVELS.length} set
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

          {/* Rates Table */}
          {isLoadingDetails ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading rates...
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Contract Level</TableHead>
                    <TableHead className="text-right">Commission Rate (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CONTRACT_LEVELS.map((level) => {
                    const value = rates[level] || '';
                    const hasValue = value.trim();

                    return (
                      <TableRow key={level} className="h-10">
                        <TableCell className="font-medium">{level}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => handleRateChange(level, e.target.value)}
                              placeholder="0.0"
                              step="0.01"
                              min="0"
                              max="200"
                              className={`h-8 w-20 text-right text-sm rounded-md border bg-transparent px-3 py-1 shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${
                                hasValue ? 'border-border' : 'border-muted'
                              }`}
                            />
                            <span className="text-sm text-muted-foreground w-4">%</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
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
