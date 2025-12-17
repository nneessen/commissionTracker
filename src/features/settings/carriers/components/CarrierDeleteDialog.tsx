// src/features/settings/carriers/components/CarrierDeleteDialog.tsx
// Redesigned with zinc palette and compact design patterns

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Carrier } from '../hooks/useCarriers';

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
      <AlertDialogContent className="max-w-sm p-3 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800">
        <AlertDialogHeader className="space-y-1">
          <AlertDialogTitle className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Delete Carrier?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-[11px]">
            <p className="text-zinc-600 dark:text-zinc-400">
              Are you sure you want to delete{' '}
              <strong className="text-zinc-900 dark:text-zinc-100">{carrier.name}</strong>?
            </p>
            {productCount > 0 && (
              <p className="text-red-600 dark:text-red-400 font-medium">
                Warning: This carrier has {productCount} associated product
                {productCount !== 1 ? 's' : ''}. Deleting this carrier may affect those products.
              </p>
            )}
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
              This action cannot be undone.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-1 pt-3">
          <AlertDialogCancel
            disabled={isDeleting}
            className="h-7 px-2 text-[10px] border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="h-7 px-2 text-[10px] bg-red-600 text-white hover:bg-red-700"
          >
            {isDeleting ? 'Deleting...' : 'Delete Carrier'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
