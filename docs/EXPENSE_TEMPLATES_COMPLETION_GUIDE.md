# Expense Templates - UI Implementation Guide

**Status**: Database & Service Layer ✅ Complete | UI Layer ⏳ Pending

## What's Been Built (3 commits)

### Commit 1: `ff7c878` - Recurring & Tax Deductible Tracking
- ✅ Database fields: `is_recurring`, `recurring_frequency`, `is_tax_deductible`
- ✅ Services: expenseAnalyticsService, expenseService
- ✅ UI: ExpenseDialog with checkboxes
- ✅ Dashboard KPIs integration

### Commit 2: `9ead6f4` - Dashboard KPI Integration
- ✅ useMetricsWithDateRange hook updated
- ✅ Dashboard shows: Recurring, One-Time, Tax Deductible expenses

### Commit 3: `363b25a` - Expense Templates Foundation
- ✅ Database: `expense_templates` table with RLS
- ✅ Types: ExpenseTemplate interfaces
- ✅ Service: expenseTemplateService (full CRUD)

## What Remains (UI Layer Only - ~2-3 hours)

### 1. Update ExpenseDialog Component

**File**: `src/features/expenses/components/ExpenseDialog.tsx`

**Changes Needed**:
```typescript
// Add state for template name input
const [saveAsTemplate, setSaveAsTemplate] = useState(false);
const [templateName, setTemplateName] = useState('');

// Add "Save as Template" section after the Notes field
{saveAsTemplate && (
  <div className="space-y-2">
    <Label htmlFor="template_name">Template Name</Label>
    <Input
      id="template_name"
      value={templateName}
      onChange={(e) => setTemplateName(e.target.value)}
      placeholder="e.g., Netflix Monthly"
    />
  </div>
)}

// Add checkbox before DialogFooter
<div className="flex items-center space-x-2 pt-4">
  <input
    type="checkbox"
    id="save_as_template"
    checked={saveAsTemplate}
    onChange={(e) => setSaveAsTemplate(e.target.checked)}
  />
  <Label htmlFor="save_as_template" className="cursor-pointer font-normal">
    Save as template for quick re-use
  </Label>
</div>

// Update handleSubmit to save template
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  // Save expense
  await onSave(formData);

  // Save template if checked
  if (saveAsTemplate && templateName) {
    await expenseTemplateService.create({
      template_name: templateName,
      amount: formData.amount,
      category: formData.category,
      expense_type: formData.expense_type,
      is_tax_deductible: formData.is_tax_deductible,
      recurring_frequency: formData.recurring_frequency,
      notes: formData.notes,
      description: formData.description,
    });
  }
};
```

### 2. Create ExpenseTemplatesPanel Component

**File**: `src/features/expenses/components/ExpenseTemplatesPanel.tsx`

```typescript
import { useState } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { expenseTemplateService } from '@/services/expenses/expenseTemplateService';
import { ExpenseTemplate } from '@/types/expense.types';
import { getRecurringShortLabel } from '../config/recurringConfig';

interface ExpenseTemplatesPanelProps {
  onUseTemplate: (template: ExpenseTemplate) => void;
  onEditTemplate: (template: ExpenseTemplate) => void;
  onDeleteTemplate: (template: ExpenseTemplate) => void;
}

export function ExpenseTemplatesPanel({
  onUseTemplate,
  onEditTemplate,
  onDeleteTemplate,
}: ExpenseTemplatesPanelProps) {
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['expense-templates'],
    queryFn: () => expenseTemplateService.getAll(),
  });

  if (isLoading) {
    return <div className="p-4 text-center">Loading templates...</div>;
  }

  if (templates.length === 0) {
    return (
      <div className="p-8 text-center border rounded-lg">
        <p className="text-muted-foreground">
          No templates yet. Save an expense as a template for quick re-use!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">
        Quick Add Templates
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {templates.map((template) => (
          <div
            key={template.id}
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
          >
            <button
              onClick={() => onUseTemplate(template)}
              className="flex-1 text-left"
            >
              <div className="font-medium">{template.template_name}</div>
              <div className="text-sm text-muted-foreground">
                ${template.amount.toFixed(2)}
                {template.recurring_frequency && (
                  <span className="ml-2 text-xs">
                    {getRecurringShortLabel(template.recurring_frequency)}
                  </span>
                )}
              </div>
            </button>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEditTemplate(template)}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive"
                onClick={() => onDeleteTemplate(template)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. Integrate into ExpenseDashboard

**File**: `src/features/expenses/ExpenseDashboard.tsx`

**Add state**:
```typescript
const [templateToEdit, setTemplateToEdit] = useState<ExpenseTemplate | null>(null);
```

**Add handlers**:
```typescript
const handleUseTemplate = (template: ExpenseTemplate) => {
  const expenseData = expenseTemplateService.templateToExpenseData(template);
  setSelectedExpense({
    ...expenseData,
    id: '', // Will be generated on save
    user_id: user.id,
    date: new Date().toISOString().split('T')[0], // Today's date
    created_at: '',
    updated_at: '',
  } as any);
  setIsAddDialogOpen(true);
};

const handleEditTemplate = (template: ExpenseTemplate) => {
  setTemplateToEdit(template);
  // Open template edit dialog
};

const handleDeleteTemplate = async (template: ExpenseTemplate) => {
  if (confirm(`Delete template "${template.template_name}"?`)) {
    await expenseTemplateService.delete(template.id);
    showToast.success('Template deleted');
  }
};
```

**Add component before filters**:
```tsx
{/* Right Column - Templates & Filters Sidebar */}
<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
  <ExpenseTemplatesPanel
    onUseTemplate={handleUseTemplate}
    onEditTemplate={handleEditTemplate}
    onDeleteTemplate={handleDeleteTemplate}
  />

  <ExpenseFiltersPanel
    filters={filters}
    onFiltersChange={setFilters}
    categories={categories}
    resultCount={filteredExpenses.length}
  />
</div>
```

### 4. Create TanStack Query Hooks

**File**: `src/hooks/expenses/useExpenseTemplates.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseTemplateService } from '@/services/expenses/expenseTemplateService';
import type { CreateExpenseTemplateData, UpdateExpenseTemplateData } from '@/types/expense.types';

export function useExpenseTemplates() {
  return useQuery({
    queryKey: ['expense-templates'],
    queryFn: () => expenseTemplateService.getAll(),
  });
}

export function useCreateExpenseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateExpenseTemplateData) => expenseTemplateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-templates'] });
    },
  });
}

export function useUpdateExpenseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: UpdateExpenseTemplateData }) =>
      expenseTemplateService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-templates'] });
    },
  });
}

export function useDeleteExpenseTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => expenseTemplateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-templates'] });
    },
  });
}
```

## Testing Checklist

- [ ] Create a new expense and save as template
- [ ] Verify template appears in ExpenseTemplatesPanel
- [ ] Click template → form opens pre-filled
- [ ] Edit date and save → expense created
- [ ] Edit template → changes saved
- [ ] Delete template → removed from list
- [ ] Template with recurring frequency shows badge

## User Workflow (Final)

1. User creates expense (e.g., "Netflix $15.99")
2. Checks "Save as template" → names it "Netflix Monthly"
3. Saves expense (both expense and template created)
4. Next month: Click "Netflix Monthly" template
5. Form opens pre-filled with all data
6. User changes date to current month → saves
7. Expense created in ~3 seconds vs 30+ seconds manual entry

## Benefits Over Old "Recurring" Checkbox

**Old way**: Checkbox did nothing except analytics
**New way**: One-click pre-filled forms = 10x faster entry

This solves the actual user pain point!
