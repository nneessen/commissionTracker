// src/features/expenses/components/ExpenseDeleteDialog.tsx

import { useState } from 'react';
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
  onConfirm: (deleteOption: 'single' | 'future' | 'all') => void;
  isDeleting: boolean;
}

export function ExpenseDeleteDialog({
  open,
  onOpenChange,
  expense,
  onConfirm,
  isDeleting,
}: ExpenseDeleteDialogProps) {
  const [deleteOption, setDeleteOption] = useState<'single' | 'future' | 'all'>('single');

  if (!expense) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const isRecurring = expense.is_recurring && expense.recurring_group_id;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
          <AlertDialogDescription>
            {isRecurring
              ? 'This is a recurring expense. Choose how you want to delete it:'
              : 'Are you sure you want to delete this expense? This action cannot be undone.'}
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
          {isRecurring && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Recurring:</span>
              <span className="font-medium capitalize">{expense.recurring_frequency}</span>
            </div>
          )}
        </div>

        {isRecurring && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Delete options:</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteOption"
                  value="single"
                  checked={deleteOption === 'single'}
                  onChange={(e) => setDeleteOption(e.target.value as 'single')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="text-sm font-medium">Just this one</div>
                  <div className="text-xs text-muted-foreground">Delete only this occurrence</div>
                </div>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteOption"
                  value="future"
                  checked={deleteOption === 'future'}
                  onChange={(e) => setDeleteOption(e.target.value as 'future')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="text-sm font-medium">This and all future</div>
                  <div className="text-xs text-muted-foreground">Stop recurring from this date forward</div>
                </div>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="deleteOption"
                  value="all"
                  checked={deleteOption === 'all'}
                  onChange={(e) => setDeleteOption(e.target.value as 'all')}
                  className="w-4 h-4"
                />
                <div>
                  <div className="text-sm font-medium">All occurrences</div>
                  <div className="text-xs text-muted-foreground">Delete entire recurring series</div>
                </div>
              </label>
            </div>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => onConfirm(deleteOption)}
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
