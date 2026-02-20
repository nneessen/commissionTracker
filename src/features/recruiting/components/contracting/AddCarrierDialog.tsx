// src/features/recruiting/components/contracting/AddCarrierDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { carrierContractRequestService } from '@/services/recruiting/carrierContractRequestService';
import { AlertCircle, Plus, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddCarrierDialogProps {
  recruitId: string;
  open: boolean;
  onClose: () => void;
  onAdd: (carrierId: string) => Promise<void>;
}

export function AddCarrierDialog({ recruitId, open, onClose, onAdd }: AddCarrierDialogProps) {
  const [selectedCarrierIds, setSelectedCarrierIds] = useState<string[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: availableCarriers, isLoading, error: queryError } = useQuery({
    queryKey: ['available-carriers', recruitId],
    queryFn: () => carrierContractRequestService.getAvailableCarriers(recruitId),
    enabled: open,
  });

  const handleToggleCarrier = (carrierId: string) => {
    setSelectedCarrierIds(prev =>
      prev.includes(carrierId)
        ? prev.filter(id => id !== carrierId)
        : [...prev, carrierId]
    );
  };

  const handleAddSelectedCarriers = async () => {
    if (selectedCarrierIds.length === 0) return;

    setError(null);
    setIsAdding(true);

    try {
      // Add carriers sequentially to maintain order
      for (const carrierId of selectedCarrierIds) {
        await onAdd(carrierId);
      }
      // Only close if all successful
      onClose();
      setSelectedCarrierIds([]);
    } catch (err) {
      console.error('Failed to add carriers:', err);
      setError(err instanceof Error ? err.message : 'Failed to add carriers. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDialogClose = (isOpen: boolean) => {
    if (!isOpen && !isAdding) {
      setError(null);
      setSelectedCarrierIds([]);
      onClose();
    }
  };

  const sortedCarriers = (availableCarriers || []).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-5 py-3.5 border-b">
          <DialogTitle className="text-base font-semibold">Add Carrier Contracts</DialogTitle>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Select carriers to request contracts for this recruit
          </p>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <div className="px-5 pt-4">
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Query Error Alert */}
        {queryError && (
          <div className="px-5 pt-4">
            <Alert variant="destructive" className="py-2.5">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Failed to load carriers. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Carrier Grid */}
        <div className="px-5 py-4">
          {isLoading && (
            <div className="py-12 text-center">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-400 mx-auto mb-2" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading carriers...</p>
            </div>
          )}

          {!isLoading && !queryError && sortedCarriers.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {sortedCarriers.map((carrier) => {
                const isSelected = selectedCarrierIds.includes(carrier.id);
                return (
                  <label
                    key={carrier.id}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded border-2 cursor-pointer transition-all
                      ${isSelected
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                        : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600 bg-white dark:bg-zinc-900'
                      }
                      ${isAdding ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isAdding}
                      onCheckedChange={() => !isAdding && handleToggleCarrier(carrier.id)}
                      className="flex-shrink-0"
                    />
                    <span className={`text-sm font-medium flex-1 ${isSelected ? 'text-emerald-900 dark:text-emerald-100' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {carrier.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          {!isLoading && !queryError && sortedCarriers.length === 0 && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 mb-3">
                <AlertCircle className="h-5 w-5 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                All Carriers Requested
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                This recruit has already requested contracts for all available carriers
              </p>
            </div>
          )}
        </div>

        {/* Footer with Add Button */}
        {!isLoading && !queryError && sortedCarriers.length > 0 && (
          <DialogFooter className="px-5 py-3.5 border-t bg-zinc-50 dark:bg-zinc-900/50">
            <div className="flex items-center justify-between w-full gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {selectedCarrierIds.length} carrier{selectedCarrierIds.length !== 1 ? 's' : ''} selected
                </span>
                {selectedCarrierIds.length > 0 && (
                  <button
                    onClick={() => setSelectedCarrierIds([])}
                    disabled={isAdding}
                    className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDialogClose(false)}
                  disabled={isAdding}
                  size="sm"
                  className="h-8 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddSelectedCarriers}
                  disabled={selectedCarrierIds.length === 0 || isAdding}
                  size="sm"
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                >
                  {isAdding ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5 mr-1.5" />
                      Add {selectedCarrierIds.length > 0 ? `(${selectedCarrierIds.length})` : ''}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
