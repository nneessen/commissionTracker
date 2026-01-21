// src/features/expenses/components/ExpenseDialog.tsx

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Expense,
  CreateExpenseData,
  RecurringFrequency,
} from "@/types/expense.types";
import { DEFAULT_EXPENSE_CATEGORIES } from "@/types/expense.types";
import {
  RECURRING_FREQUENCY_OPTIONS,
  TAX_DEDUCTIBLE_TOOLTIP,
} from "../config/recurringConfig";
import { useCreateExpenseTemplate } from "../../../hooks/expenses/useExpenseTemplates";
import { getTodayString } from "../../../lib/date";
import { toast } from "sonner";

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
    name: "",
    description: "",
    amount: 0,
    category: "",
    expense_type: "personal",
    date: getTodayString(),
    is_recurring: false,
    recurring_frequency: null,
    is_tax_deductible: false,
    receipt_url: "",
    notes: "",
  });

  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const createTemplate = useCreateExpenseTemplate();

  useEffect(() => {
    if (expense) {
      setFormData({
        name: expense.name,
        description: expense.description || "",
        amount: expense.amount,
        category: expense.category,
        expense_type: expense.expense_type,
        date: expense.date,
        is_recurring: expense.is_recurring || false,
        recurring_frequency: expense.recurring_frequency || null,
        is_tax_deductible: expense.is_tax_deductible || false,
        receipt_url: expense.receipt_url || "",
        notes: expense.notes || "",
      });
    } else {
      setFormData({
        name: "",
        description: "",
        amount: 0,
        category: "",
        expense_type: "personal",
        date: getTodayString(),
        is_recurring: false,
        recurring_frequency: null,
        is_tax_deductible: false,
        receipt_url: "",
        notes: "",
      });
    }
  }, [expense, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Save expense first
    onSave(formData);

    // Save as template if checkbox is checked (only for new expenses, not edits)
    if (!expense && saveAsTemplate && templateName.trim()) {
      try {
        await createTemplate.mutateAsync({
          template_name: templateName.trim(),
          amount: formData.amount,
          category: formData.category,
          expense_type: formData.expense_type,
          is_tax_deductible: formData.is_tax_deductible,
          recurring_frequency: formData.recurring_frequency,
          notes: formData.notes,
          description: formData.description,
        });
        toast.success("Template saved!");
      } catch (error) {
        console.error("Failed to save template:", error);
        toast.error("Failed to save template");
      }
    }

    // Reset template fields
    setSaveAsTemplate(false);
    setTemplateName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-lg font-semibold">
            {expense ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
          <DialogDescription className="text-xs mt-1">
            {expense
              ? "Update the expense details"
              : "Fill in the details to add a new expense"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label htmlFor="amount">
                Amount <span className="text-destructive">*</span>
              </Label>
              <Input
                style={{ backgroundColor: "white" }}
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amount: parseFloat(e.target.value),
                  })
                }
                required
              />
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date">
                Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>

            {/* Expense Type */}
            <div className="space-y-1.5">
              <Label htmlFor="expense_type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.expense_type}
                onValueChange={(value: "personal" | "business") =>
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
            <div className="space-y-1.5">
              <Label htmlFor="category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
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
          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />
          </div>

          {/* Checkboxes Row */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Recurring Expense */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_recurring"
                checked={formData.is_recurring || false}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    is_recurring: checked as boolean,
                    recurring_frequency: checked
                      ? formData.recurring_frequency
                      : null,
                  })
                }
              />
              <Label
                htmlFor="is_recurring"
                className="cursor-pointer font-normal"
              >
                Recurring Expense
              </Label>
            </div>

            {/* Tax Deductible */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_tax_deductible"
                checked={formData.is_tax_deductible || false}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    is_tax_deductible: checked as boolean,
                  })
                }
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
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="recurring_frequency">
                  How Often? <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.recurring_frequency || ""}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      recurring_frequency: value as RecurringFrequency,
                    })
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
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="recurring_end_date">End Date (Optional)</Label>
                <Input
                  id="recurring_end_date"
                  type="date"
                  value={formData.recurring_end_date || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      recurring_end_date: e.target.value || null,
                    })
                  }
                  min={formData.date}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to continue indefinitely. Set a date to stop
                  recurring expenses automatically (e.g., end of lease).
                </p>
              </div>

              <p className="text-xs text-foreground pl-3 py-2 bg-gradient-to-r from-primary/20 via-info/10 to-card shadow-sm rounded-md">
                ⚡ <strong>Auto-generation:</strong> When you create this
                recurring expense, the next 12 occurrences will be automatically
                generated for you (or up to the end date if sooner).
              </p>
            </div>
          )}

          {/* Receipt URL */}
          <div className="space-y-1.5">
            <Label htmlFor="receipt_url">Receipt URL</Label>
            <Input
              id="receipt_url"
              type="url"
              placeholder="https://..."
              value={formData.receipt_url || ""}
              onChange={(e) =>
                setFormData({ ...formData, receipt_url: e.target.value })
              }
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={2}
            />
          </div>

          {/* Save as Template (only for new expenses) */}
          {!expense && (
            <div className="space-y-3 pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save_as_template"
                  checked={saveAsTemplate}
                  onCheckedChange={(checked) =>
                    setSaveAsTemplate(checked as boolean)
                  }
                />
                <Label
                  htmlFor="save_as_template"
                  className="cursor-pointer font-normal"
                >
                  💾 Save as template for quick re-use
                </Label>
              </div>

              {saveAsTemplate && (
                <div className="space-y-2 pl-6">
                  <Label htmlFor="template_name">Template Name</Label>
                  <Input
                    id="template_name"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., Netflix Monthly, Office Rent"
                  />
                  <p className="text-xs text-muted-foreground">
                    Give your template a memorable name. Click this template
                    later to quickly add this expense again!
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : expense ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
