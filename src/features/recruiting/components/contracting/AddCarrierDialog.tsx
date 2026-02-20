// src/features/recruiting/components/contracting/AddCarrierDialog.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { carrierContractRequestService } from '@/services/recruiting/carrierContractRequestService';
import { Search, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AddCarrierDialogProps {
  recruitId: string;
  open: boolean;
  onClose: () => void;
  onAdd: (carrierId: string) => Promise<void>;
}

export function AddCarrierDialog({ recruitId, open, onClose, onAdd }: AddCarrierDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [addingCarrierId, setAddingCarrierId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: availableCarriers, isLoading, error: queryError } = useQuery({
    queryKey: ['available-carriers', recruitId],
    queryFn: () => carrierContractRequestService.getAvailableCarriers(recruitId),
    enabled: open,
  });

  const filteredCarriers = (availableCarriers || []).filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddCarrier = async (carrierId: string) => {
    setError(null);
    setAddingCarrierId(carrierId);

    try {
      await onAdd(carrierId);
      // Only close if successful
      onClose();
      setSearchQuery(''); // Reset search on success
    } catch (err) {
      console.error('Failed to add carrier:', err);
      setError(err instanceof Error ? err.message : 'Failed to add carrier. Please try again.');
    } finally {
      setAddingCarrierId(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setError(null);
          setSearchQuery('');
        }
        onClose();
      }}
    >
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle className="text-sm">Add Carrier Contract</DialogTitle>
        </DialogHeader>

        {/* Error Alert */}
        {error && (
          <div className="px-4 pt-3">
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Query Error Alert */}
        {queryError && (
          <div className="px-4 pt-3">
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Failed to load carriers. Please try again.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-2 border-b bg-muted/30">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search carriers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
              disabled={isLoading}
            />
          </div>
        </div>

        {/* Carrier List */}
        <div className="max-h-[400px] overflow-y-auto">
          {isLoading && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Loading carriers...
            </div>
          )}

          {!isLoading && !queryError && filteredCarriers.length > 0 && (
            <div className="divide-y">
              {filteredCarriers.map((carrier) => (
                <button
                  key={carrier.id}
                  onClick={() => handleAddCarrier(carrier.id)}
                  disabled={addingCarrierId !== null}
                  className="w-full px-4 py-2.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{carrier.name}</span>
                    {addingCarrierId === carrier.id && (
                      <span className="text-xs text-muted-foreground">Adding...</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {!isLoading && !queryError && filteredCarriers.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              {searchQuery
                ? 'No carriers found matching your search'
                : 'All available carriers have been requested'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
