// src/features/dashboard/components/FinancialHealthCard.tsx

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface FinancialHealthCardProps {
  monthlyExpenses: number;
  totalEarned: number;
  totalPending: number;
  breakevenCommission: number;
  surplusDeficit: number;
}

export const FinancialHealthCard: React.FC<FinancialHealthCardProps> = ({
  monthlyExpenses,
  totalEarned,
  totalPending,
  breakevenCommission,
  surplusDeficit,
}) => {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('monthly');

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Calculate values based on selected time period
  const getAdjustedValue = (monthlyValue: number) => {
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    switch (timePeriod) {
      case 'daily':
        return monthlyValue / daysInMonth;
      case 'weekly':
        return (monthlyValue / daysInMonth) * 7;
      case 'monthly':
        return monthlyValue;
      case 'yearly':
        return monthlyValue * 12;
      default:
        return monthlyValue;
    }
  };

  const adjustedExpenses = getAdjustedValue(monthlyExpenses);
  const adjustedEarned = getAdjustedValue(totalEarned);
  const adjustedSurplus = adjustedEarned - adjustedExpenses;

  const isSurplus = adjustedSurplus >= 0;
  const healthPercentage = adjustedExpenses > 0
    ? Math.min(100, (adjustedEarned / adjustedExpenses) * 100)
    : 0;

  const getPeriodLabel = () => {
    switch (timePeriod) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      case 'yearly': return 'Yearly';
      default: return 'Monthly';
    }
  };

  return (
    <div className="bg-gradient-to-br from-card to-muted/20 rounded-lg p-6 shadow-md mb-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm">
            <DollarSign className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground m-0">
              Financial Health
            </h3>
            <p className="text-sm text-muted-foreground m-0">
              Breakeven tracking & income analysis
            </p>
          </div>
        </div>

        {/* Time Period Switcher */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-lg shadow-inner">
          {(['daily', 'weekly', 'monthly', 'yearly'] as TimePeriod[]).map((period) => (
            <button
              key={period}
              onClick={() => setTimePeriod(period)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold capitalize rounded-md transition-all",
                timePeriod === period
                  ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm"
                  : "bg-transparent text-muted-foreground hover:bg-background/50"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
        {/* Expenses */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-muted/30 to-muted/50 shadow-sm">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
            {getPeriodLabel()} Expenses
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {formatCurrency(adjustedExpenses)}
          </div>
          <div className="text-xs text-muted-foreground/80 mt-1">
            Break even target
          </div>
        </div>

        {/* Commission Earned */}
        <div className={cn(
          "p-4 rounded-lg shadow-sm",
          isSurplus
            ? "bg-gradient-to-br from-success/10 to-success/20"
            : "bg-gradient-to-br from-error/10 to-error/20"
        )}>
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
            {getPeriodLabel()} Commission
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {formatCurrency(adjustedEarned)}
          </div>
          <div className={cn(
            "text-xs mt-1 flex items-center gap-1",
            isSurplus ? "text-success" : "text-error"
          )}>
            {isSurplus ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {isSurplus ? `+${formatCurrency(adjustedSurplus)} surplus` : `${formatCurrency(Math.abs(adjustedSurplus))} deficit`}
          </div>
        </div>

        {/* Pipeline */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-info/10 to-info/20 shadow-sm">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
            Pipeline Value
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {formatCurrency(totalPending)}
          </div>
          <div className="text-xs text-muted-foreground/80 mt-1">
            Pending commissions
          </div>
        </div>
      </div>

      {/* Health Progress Bar */}
      <div className="p-4 rounded-lg bg-gradient-to-br from-muted/30 to-muted/50 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-foreground font-semibold uppercase tracking-wide">
            Breakeven Progress
          </span>
          <span className="text-sm text-foreground font-bold">
            {healthPercentage.toFixed(0)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 bg-muted rounded-md overflow-hidden shadow-inner">
          <div
            className={cn(
              "h-full rounded-md transition-all duration-300",
              healthPercentage >= 100
                ? "bg-gradient-to-r from-success to-success/80"
                : "bg-gradient-to-r from-primary to-primary/80"
            )}
            style={{ width: `${healthPercentage}%` }}
          />
        </div>

        <div className="text-xs text-muted-foreground/80 mt-2">
          {healthPercentage >= 100
            ? '✓ You have exceeded your breakeven target'
            : `${formatCurrency(adjustedExpenses - adjustedEarned)} needed to break even`}
        </div>
      </div>

      {/* Alert if needed */}
      {healthPercentage < 50 && (
        <div className="mt-4 p-3 rounded-lg bg-gradient-to-br from-warning/20 to-warning/30 border border-warning/30 flex items-center gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-warning" />
          <span className="text-sm text-warning font-medium">
            You're below 50% of your breakeven target. Focus on production!
          </span>
        </div>
      )}
    </div>
  );
};