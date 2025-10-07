// src/features/expenses/components/ExpenseDialog.tsx

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useExpenseCategories } from '@/hooks/expenses/useExpenseCategories';
import type { Expense, CreateExpenseData, UpdateExpenseData } from '@/types/expense.types';

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense?: Expense | null;
  onSave: (data: CreateExpenseData | { id: string; updates: UpdateExpenseData }) => void;
  isSaving: boolean;
}

export function ExpenseDialog({
  open,
  onOpenChange,
  expense,
  onSave,
  isSaving,
}: ExpenseDialogProps) {
  const { data: categories = [], isLoading: isLoadingCategories } = useExpenseCategories();
  const [formData, setFormData] = useState<CreateExpenseData>({
    name: '',
    description: '',
    amount: 0,
    category: categories[0]?.name || 'Other',
    expense_type: 'personal',
    date: new Date().toISOString().split('T')[0],
    receipt_url: null,
    is_deductible: false,
    notes: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when editing
  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        description: expense.description,
        amount: expense.amount,
        category: expense.category,
        expense_type: expense.expense_type,
        date: expense.date,
        receipt_url: expense.receipt_url,
        is_deductible: expense.is_deductible,
        notes: expense.notes,
      });
    } else {
      // Reset form for new expense
      setFormData({
        name: '',
        description: '',
        amount: 0,
        category: categories[0]?.name || 'Other',
        expense_type: 'personal',
        date: new Date().toISOString().split('T')[0],
        receipt_url: null,
        is_deductible: false,
        notes: null,
      });
    }
    setErrors({});
  }, [expense, open]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    if (expense) {
      // Update existing expense
      onSave({
        id: expense.id,
        updates: formData,
      });
    } else {
      // Create new expense
      onSave(formData);
    }
  };

  const handleInputChange = (field: keyof CreateExpenseData, value: string | number | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expense ? 'Edit Expense' : 'Add New Expense'}</DialogTitle>
          <DialogDescription>
            {expense
              ? 'Update the expense details below'
              : 'Fill in the details for your new expense'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Office Supplies"
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
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
                onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className={errors.amount ? 'border-destructive' : ''}
              />
              {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
            </div>

            {/* Expense Type */}
            <div className="space-y-2">
              <Label htmlFor="expense_type">
                Type <span className="text-destructive">*</span>
              </Label>
              <select
                id="expense_type"
                value={formData.expense_type}
                onChange={(e) => handleInputChange('expense_type', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="personal">Personal</option>
                <option value="business">Business</option>
              </select>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange('category', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                disabled={isLoadingCategories}
              >
                {categories.length === 0 && (
                  <option value="Other">Other</option>
                )}
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
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
                onChange={(e) => handleInputChange('date', e.target.value)}
                className={errors.date ? 'border-destructive' : ''}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date}</p>
              )}
            </div>

            {/* Receipt URL */}
            <div className="space-y-2">
              <Label htmlFor="receipt_url">Receipt URL</Label>
              <Input
                id="receipt_url"
                type="url"
                value={formData.receipt_url || ''}
                onChange={(e) => handleInputChange('receipt_url', e.target.value || null)}
                placeholder="https://..."
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe this expense..."
              rows={3}
              className={errors.description ? 'border-destructive' : ''}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => handleInputChange('notes', e.target.value || null)}
              placeholder="Any additional information..."
              rows={2}
            />
          </div>

          {/* Is Deductible Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              id="is_deductible"
              type="checkbox"
              checked={formData.is_deductible}
              onChange={(e) => handleInputChange('is_deductible', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_deductible" className="font-normal cursor-pointer">
              This expense is tax deductible
            </Label>
          </div>

          {/* Is Recurring Checkbox */}
          <div className="flex items-center space-x-2">
            <input
              id="is_recurring"
              type="checkbox"
              checked={formData.is_recurring || false}
              onChange={(e) => handleInputChange('is_recurring', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="is_recurring" className="font-normal cursor-pointer">
              This is a recurring expense
            </Label>
          </div>

          {/* Recurring Frequency (shown only if is_recurring is true) */}
          {formData.is_recurring && (
            <div className="space-y-2">
              <Label htmlFor="recurring_frequency">Recurring Frequency</Label>
              <select
                id="recurring_frequency"
                value={formData.recurring_frequency || 'monthly'}
                onChange={(e) => handleInputChange('recurring_frequency', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : expense ? 'Update Expense' : 'Add Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
