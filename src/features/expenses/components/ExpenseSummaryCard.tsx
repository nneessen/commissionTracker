// src/features/expenses/components/ExpenseSummaryCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '../../../lib/format';
import { EXPENSE_CARD_STYLES, EXPENSE_GRADIENTS } from '../config/expenseDashboardConfig';
import { getMomGrowthColor, formatMomGrowth } from '../config/expenseSummaryConfig';
import { cn } from '@/lib/utils';

export interface ExpenseSummaryCardProps {
  totalAmount: number;
  businessAmount: number;
  personalAmount: number;
  deductibleAmount: number;
  transactionCount: number;
  momGrowthPercentage: number;
}

/**
 * ExpenseSummaryCard - Summary statistics for expenses
 *
 * Displays:
 * - Total expenses (highlighted)
 * - Business vs Personal breakdown
 * - Tax deductible amount
 * - Transaction count
 * - Month-over-month growth trend
 *
 * Design: Gradient background, highlighted total, semantic color for growth
 */
export function ExpenseSummaryCard({
  totalAmount,
  businessAmount,
  personalAmount,
  deductibleAmount,
  transactionCount,
  momGrowthPercentage,
}: ExpenseSummaryCardProps) {
  const growthColor = getMomGrowthColor(momGrowthPercentage);
  const growthText = formatMomGrowth(momGrowthPercentage);

  return (
    <Card>
      <CardHeader className={EXPENSE_CARD_STYLES.header}>
        <div className="flex items-center justify-between">
          <CardTitle className={EXPENSE_CARD_STYLES.title}>
            Expense Summary
          </CardTitle>
          <Badge
            variant={momGrowthPercentage > 0 ? 'destructive' : 'default'}
            className="text-xs"
          >
            {growthText}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className={cn(EXPENSE_CARD_STYLES.content, EXPENSE_CARD_STYLES.spacing)}>
        {/* Total Expenses - Highlighted */}
        <div className={cn('rounded-lg p-4 shadow-sm', EXPENSE_GRADIENTS.summary)}>
          <div className="flex items-center justify-between">
            <div className={EXPENSE_CARD_STYLES.label}>Total Expenses</div>
            <div className={EXPENSE_CARD_STYLES.valueHighlight}>
              {formatCurrency(totalAmount)}
            </div>
          </div>
        </div>

        {/* Breakdown */}
        <div className={EXPENSE_CARD_STYLES.spacing}>
          {/* Business */}
          <StatRow label="Business" value={formatCurrency(businessAmount)} />

          {/* Personal */}
          <StatRow label="Personal" value={formatCurrency(personalAmount)} />

          {/* Deductible */}
          <StatRow
            label="Tax Deductible"
            value={formatCurrency(deductibleAmount)}
            highlight
          />
        </div>

        {/* Transaction Count */}
        <div className="pt-3 mt-3 shadow-sm rounded-md bg-muted/10 p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Transactions</div>
            <div className="font-mono font-semibold text-sm">{transactionCount}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * StatRow - Reusable row for displaying label/value pairs
 */
function StatRow({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'flex items-center justify-between',
      highlight && 'p-2 bg-muted/10 rounded-md'
    )}>
      <div className={EXPENSE_CARD_STYLES.label}>{label}</div>
      <div className={cn(
        EXPENSE_CARD_STYLES.value,
        highlight && 'text-base'
      )}>
        {value}
      </div>
    </div>
  );
}
