import React from 'react';
import {AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from '@/components/ui/alert-dialog';
import {Carrier} from '../hooks/useCarriers';

interface CarrierDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrier: Carrier | null;
  productCount?: number;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export function CarrierDeleteDialog({
  open,
  onOpenChange,
  carrier,
  productCount = 0,
  onConfirm,
  isDeleting = false,
}: CarrierDeleteDialogProps) {
  if (!carrier) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Carrier?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Are you sure you want to delete <strong>{carrier.name}</strong>?
            </p>
            {productCount > 0 && (
              <p className="text-destructive font-medium">
                Warning: This carrier has {productCount} associated product{productCount !== 1 ? 's' : ''}.
                Deleting this carrier may affect those products.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete Carrier'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
