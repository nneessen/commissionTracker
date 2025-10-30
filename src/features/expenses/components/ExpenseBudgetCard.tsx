// src/features/expenses/components/ExpenseBudgetCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../../../lib/format';
import { EXPENSE_CARD_STYLES, EXPENSE_GRADIENTS } from '../config/expenseDashboardConfig';
import type { BudgetStatus } from '../config/expenseBudgetConfig';
import { cn } from '@/lib/utils';

export interface ExpenseBudgetCardProps {
  budgetStatus: BudgetStatus;
}

/**
 * ExpenseBudgetCard - NEW FEATURE - Budget tracking with progress
 *
 * Displays:
 * - Budget type (monthly/yearly/business/personal)
 * - Actual spending vs budget
 * - Progress bar with color coding
 * - Remaining budget
 * - Status badge (safe/warning/danger)
 *
 * Design: Gradient background based on status, prominent progress bar
 */
export function ExpenseBudgetCard({ budgetStatus }: ExpenseBudgetCardProps) {
  const {
    label,
    actual,
    budget,
    percentage,
    remaining,
    status,
    color,
  } = budgetStatus;

  // Progress bar color based on status
  const progressBarColor =
    status === 'safe'
      ? 'bg-success'
      : status === 'warning'
        ? 'bg-warning'
        : 'bg-error';

  // Background gradient based on status
  const gradient =
    status === 'safe'
      ? EXPENSE_GRADIENTS.budget
      : status === 'warning'
        ? EXPENSE_GRADIENTS.warning
        : EXPENSE_GRADIENTS.danger;

  // Badge variant
  const badgeVariant =
    status === 'safe'
      ? 'default'
      : status === 'warning'
        ? 'secondary'
        : 'destructive';

  return (
    <Card>
      <CardHeader className={EXPENSE_CARD_STYLES.header}>
        <div className="flex items-center justify-between">
          <CardTitle className={EXPENSE_CARD_STYLES.title}>{label}</CardTitle>
          <Badge variant={badgeVariant} className="text-xs capitalize">
            {status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={cn(EXPENSE_CARD_STYLES.content, EXPENSE_CARD_STYLES.spacing)}>
        {/* Budget Overview - Highlighted */}
        <div className={cn('rounded-lg p-4 shadow-sm', gradient)}>
          <div className={EXPENSE_CARD_STYLES.spacing}>
            {/* Spent vs Budget */}
            <div className="flex items-center justify-between">
              <div className={EXPENSE_CARD_STYLES.label}>Spent</div>
              <div className={EXPENSE_CARD_STYLES.valueHighlight}>
                {formatCurrency(actual)}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className={EXPENSE_CARD_STYLES.label}>Budget</div>
              <div className={EXPENSE_CARD_STYLES.value}>
                {formatCurrency(budget)}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className={cn('font-semibold font-mono', color)}>
              {percentage.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
            <div
              className={cn(
                'h-full transition-all duration-500 ease-out',
                progressBarColor
              )}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Remaining Budget */}
        <div className="pt-3 mt-3 shadow-sm rounded-md bg-muted/10 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className={cn('font-mono font-semibold text-sm', color)}>
              {formatCurrency(remaining)}
            </div>
          </div>
        </div>

        {/* Warning Messages */}
        {status === 'warning' && (
          <div className="text-xs text-warning p-2 bg-warning/10 rounded-md">
            ⚠️ Approaching budget limit
          </div>
        )}
        {status === 'danger' && (
          <div className="text-xs text-error p-2 bg-error/10 rounded-md">
            🚨 Over budget by {formatCurrency(actual - budget)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
