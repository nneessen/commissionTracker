// src/features/expenses/components/ExpenseDialog.tsx

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import type { Expense, CreateExpenseData, RecurringFrequency } from '@/types/expense.types';
import { DEFAULT_EXPENSE_CATEGORIES } from '@/types/expense.types';
import { RECURRING_FREQUENCY_OPTIONS, TAX_DEDUCTIBLE_TOOLTIP } from '../config/recurringConfig';

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  onSave: (data: CreateExpenseData) => void;
  isSubmitting: boolean;
}

export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  onSave,
  isSubmitting,
}: ExpenseDialogProps) {
  const [formData, setFormData] = useState<CreateExpenseData>({
    name: '',
    description: '',
    amount: 0,
    category: '',
    expense_type: 'personal',
    date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_frequency: null,
    is_tax_deductible: false,
    receipt_url: '',
    notes: '',
  });

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        description: expense.description || '',
        amount: expense.amount,
        category: expense.category,
        expense_type: expense.expense_type,
        date: expense.date,
        is_recurring: expense.is_recurring || false,
        recurring_frequency: expense.recurring_frequency || null,
        is_tax_deductible: expense.is_tax_deductible || false,
        receipt_url: expense.receipt_url || '',
        notes: expense.notes || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        amount: 0,
        category: '',
        expense_type: 'personal',
        date: new Date().toISOString().split('T')[0],
        is_recurring: false,
        recurring_frequency: null,
        is_tax_deductible: false,
        receipt_url: '',
        notes: '',
      });
    }
  }, [expense, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {expense
              ? 'Update the expense details below.'
              : 'Fill in the details to add a new expense.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            {/* Expense Type */}
            <div className="space-y-2">
              <Label htmlFor="expense_type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.expense_type}
                onValueChange={(value: 'personal' | 'business') =>
                  setFormData({ ...formData, expense_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.name} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          {/* Checkboxes Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recurring Expense */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_recurring"
                checked={formData.is_recurring || false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_recurring: e.target.checked,
                    recurring_frequency: e.target.checked ? formData.recurring_frequency : null,
                  })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_recurring" className="cursor-pointer font-normal">
                Recurring Expense
              </Label>
            </div>

            {/* Tax Deductible */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_tax_deductible"
                checked={formData.is_tax_deductible || false}
                onChange={(e) =>
                  setFormData({ ...formData, is_tax_deductible: e.target.checked })
                }
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label
                htmlFor="is_tax_deductible"
                className="cursor-pointer font-normal"
                title={TAX_DEDUCTIBLE_TOOLTIP}
              >
                Tax Deductible ⓘ
              </Label>
            </div>
          </div>

          {/* Recurring Frequency (only shown if is_recurring is true) */}
          {formData.is_recurring && (
            <div className="space-y-2">
              <Label htmlFor="recurring_frequency">
                How Often? <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.recurring_frequency || ''}
                onValueChange={(value) =>
                  setFormData({ ...formData, recurring_frequency: value as RecurringFrequency })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  {RECURRING_FREQUENCY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: Recurring expenses are not auto-generated. You manually create each entry when it occurs.
              </p>
            </div>
          )}

          {/* Receipt URL */}
          <div className="space-y-2">
            <Label htmlFor="receipt_url">Receipt URL</Label>
            <Input
              id="receipt_url"
              type="url"
              placeholder="https://..."
              value={formData.receipt_url || ''}
              onChange={(e) => setFormData({ ...formData, receipt_url: e.target.value })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : expense ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}