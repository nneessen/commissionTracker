// src/features/expenses/components/ExpenseDialogCompact.tsx - Ultra-compact expense modal

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, Calendar, Info } from "lucide-react";
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

export function ExpenseDialogCompact({
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

    // Validation
    if (!formData.name || formData.amount <= 0 || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.is_recurring && !formData.recurring_frequency) {
      toast.error("Please select a frequency for recurring expense");
      return;
    }

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

  // Quick category buttons for common expenses
  const quickCategories = [
    { name: "Meals & Entertainment", type: "business" },
    { name: "Travel", type: "business" },
    { name: "Office Supplies", type: "business" },
    { name: "Groceries", type: "personal" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-sm font-semibold">
            {expense ? "Edit Expense" : "Add Expense"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Essential Fields - Compact Grid */}
          <div className="grid gap-2">
            {/* Name & Amount Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="h-7 text-xs"
                  placeholder="e.g., Lunch with client"
                />
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Amount <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                    className="h-7 text-xs pl-7 font-mono"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </div>

            {/* Date & Type Row */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Date <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2 top-1.5 h-3 w-3 text-muted-foreground" />
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                    className="h-7 text-xs pl-7"
                  />
                </div>
              </div>

              <div>
                <Label className="text-[11px] text-muted-foreground">
                  Type <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-1">
                  <Button
                    type="button"
                    variant={
                      formData.expense_type === "business"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() =>
                      setFormData({ ...formData, expense_type: "business" })
                    }
                  >
                    Business
                  </Button>
                  <Button
                    type="button"
                    variant={
                      formData.expense_type === "personal"
                        ? "default"
                        : "outline"
                    }
                    size="sm"
                    className="h-7 text-[10px]"
                    onClick={() =>
                      setFormData({ ...formData, expense_type: "personal" })
                    }
                  >
                    Personal
                  </Button>
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Category <span className="text-destructive">*</span>
              </Label>

              {/* Quick Category Buttons */}
              <div className="flex gap-1 mb-1">
                {quickCategories.map((cat) => (
                  <Button
                    key={cat.name}
                    type="button"
                    variant={
                      formData.category === cat.name ? "default" : "ghost"
                    }
                    size="sm"
                    className="h-6 px-2 text-[10px]"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        category: cat.name,
                        expense_type: cat.type as "business" | "personal",
                      })
                    }
                  >
                    {cat.name.split(" ")[0]}
                  </Button>
                ))}
              </div>

              <Select
                value={formData.category}
                onValueChange={(value) =>
                  setFormData({ ...formData, category: value })
                }
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1">
                    Business
                  </div>
                  {DEFAULT_EXPENSE_CATEGORIES.filter(
                    (cat) => cat.type === "business",
                  ).map((cat) => (
                    <SelectItem
                      key={cat.name}
                      value={cat.name}
                      className="text-xs"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                  <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 mt-1">
                    Personal
                  </div>
                  {DEFAULT_EXPENSE_CATEGORIES.filter(
                    (cat) => cat.type === "personal",
                  ).map((cat) => (
                    <SelectItem
                      key={cat.name}
                      value={cat.name}
                      className="text-xs"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                  <div className="text-[10px] font-semibold text-muted-foreground px-2 py-1 mt-1">
                    Other
                  </div>
                  {DEFAULT_EXPENSE_CATEGORIES.filter(
                    (cat) => cat.type === "general",
                  ).map((cat) => (
                    <SelectItem
                      key={cat.name}
                      value={cat.name}
                      className="text-xs"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description - Optional */}
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Description
              </Label>
              <Input
                value={formData.description || ""}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                className="h-7 text-xs"
                placeholder="Optional details"
              />
            </div>

            {/* Flags Row - Compact Checkboxes */}
            <div className="flex gap-4 py-1">
              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="is_tax_deductible"
                  checked={formData.is_tax_deductible || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      is_tax_deductible: checked as boolean,
                    })
                  }
                  className="h-3 w-3"
                />
                <Label
                  htmlFor="is_tax_deductible"
                  className="cursor-pointer text-[11px]"
                  title={TAX_DEDUCTIBLE_TOOLTIP}
                >
                  Tax Deductible
                </Label>
              </div>

              <div className="flex items-center gap-1.5">
                <Checkbox
                  id="is_recurring"
                  checked={formData.is_recurring || false}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      is_recurring: checked as boolean,
                      recurring_frequency: checked
                        ? formData.recurring_frequency || "monthly"
                        : null,
                    })
                  }
                  className="h-3 w-3"
                />
                <Label
                  htmlFor="is_recurring"
                  className="cursor-pointer text-[11px]"
                >
                  Recurring
                </Label>
              </div>

              {!expense && (
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id="save_as_template"
                    checked={saveAsTemplate}
                    onCheckedChange={(checked) =>
                      setSaveAsTemplate(checked as boolean)
                    }
                    className="h-3 w-3"
                  />
                  <Label
                    htmlFor="save_as_template"
                    className="cursor-pointer text-[11px]"
                  >
                    Save Template
                  </Label>
                </div>
              )}
            </div>

            {/* Recurring Options - Only show if recurring */}
            {formData.is_recurring && (
              <div className="bg-muted/30 p-2 rounded space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      Frequency <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={formData.recurring_frequency || "monthly"}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          recurring_frequency: value as RecurringFrequency,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRING_FREQUENCY_OPTIONS.map((option) => (
                          <SelectItem
                            key={option.value}
                            value={option.value}
                            className="text-xs"
                          >
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-[10px] text-muted-foreground">
                      End Date
                    </Label>
                    <Input
                      type="date"
                      value={formData.recurring_end_date || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          recurring_end_date: e.target.value || null,
                        })
                      }
                      min={formData.date}
                      className="h-6 text-[10px]"
                    />
                  </div>
                </div>

                <Alert className="p-1.5">
                  <Info className="h-3 w-3" />
                  <AlertDescription className="text-[10px] ml-4">
                    Next 12 occurrences will be auto-generated
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Template Name - Only show if saving as template */}
            {saveAsTemplate && !expense && (
              <div className="bg-muted/30 p-2 rounded">
                <Label className="text-[10px] text-muted-foreground">
                  Template Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Monthly Office Rent"
                  className="h-6 text-[10px] mt-1"
                />
              </div>
            )}

            {/* Notes - Optional, Collapsible */}
            <details className="group">
              <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">
                Additional Fields
              </summary>
              <div className="mt-2 space-y-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    Receipt URL
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={formData.receipt_url || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, receipt_url: e.target.value })
                    }
                    className="h-6 text-[10px]"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">
                    Notes
                  </Label>
                  <Textarea
                    value={formData.notes || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={2}
                    className="text-[10px] resize-none"
                  />
                </div>
              </div>
            </details>
          </div>

          <DialogFooter className="gap-1 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              size="sm"
              className="h-7 px-3 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="sm"
              className="h-7 px-3 text-xs"
            >
              {isSubmitting ? "Saving..." : expense ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
