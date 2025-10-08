// src/features/expenses/components/ExpenseDeleteDialog.tsx

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
import type { Expense } from '@/types/expense.types';

interface ExpenseDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function ExpenseDeleteDialog({
  open,
  onOpenChange,
  expense,
  onConfirm,
  isDeleting,
}: ExpenseDeleteDialogProps) {
  if (!expense) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this expense? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 rounded-lg border p-4 space-y-2">
          <div className="font-medium">{expense.name}</div>
          <div className="text-sm text-muted-foreground">{expense.description}</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Amount:</span>
            <span className="font-medium">{formatCurrency(expense.amount)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Type:</span>
            <span className="font-medium capitalize">{expense.expense_type}</span>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-destructive hover:bg-destructive/90"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}