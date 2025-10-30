// src/features/expenses/components/ExpenseQuickAdd.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '../../../lib/format';
import { EXPENSE_CARD_STYLES } from '../config/expenseDashboardConfig';
import { cn } from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';
import type { ExpenseTemplate } from '../../../types/expense.types';

export interface ExpenseQuickAddProps {
  templates: ExpenseTemplate[];
  onUseTemplate: (template: ExpenseTemplate) => void;
  onDeleteTemplate: (template: ExpenseTemplate) => void;
}

/**
 * ExpenseQuickAdd - Quick-add panel for expense templates
 *
 * Collapsed by default, expands to show templates.
 * One-click to add expense from template.
 *
 * Simplified, streamlined version of ExpenseTemplatesPanel
 */
export function ExpenseQuickAdd({
  templates,
  onUseTemplate,
  onDeleteTemplate,
}: ExpenseQuickAddProps) {
  if (templates.length === 0) {
    return null; // Hide if no templates
  }

  return (
    <Card>
      <CardHeader className={EXPENSE_CARD_STYLES.header}>
        <CardTitle className={EXPENSE_CARD_STYLES.title}>
          Quick Add Templates
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(EXPENSE_CARD_STYLES.content, 'space-y-2')}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
          {templates.slice(0, 6).map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-2 rounded-md bg-muted/20 hover:bg-muted/40 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">
                  {template.template_name}
                </div>
                <div className="text-xs text-muted-foreground font-mono">
                  {formatCurrency(template.amount)}
                </div>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0"
                  onClick={() => onUseTemplate(template)}
                  title="Add expense"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => onDeleteTemplate(template)}
                  title="Delete template"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {templates.length > 6 && (
          <div className="text-xs text-center text-muted-foreground pt-2">
            + {templates.length - 6} more templates
          </div>
        )}
      </CardContent>
    </Card>
  );
}
