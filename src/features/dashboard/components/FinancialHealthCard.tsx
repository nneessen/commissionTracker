// src/features/dashboard/components/FinancialHealthCard.tsx

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    <Card className="bg-gradient-to-br from-card via-success/5 to-card mb-6 shadow-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-gradient-to-br from-success via-status-active to-success/70 shadow-lg">
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
              <Button
                key={period}
                onClick={() => setTimePeriod(period)}
                variant="ghost"
                size="sm"
                className={cn(
                  "px-3 py-1.5 h-auto text-xs font-semibold capitalize rounded-md transition-all",
                  timePeriod === period
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm"
                    : "bg-transparent text-muted-foreground hover:bg-background/50"
                )}
              >
                {period}
              </Button>
            ))}
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <Card className="bg-gradient-to-br from-muted/30 to-card shadow-md">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
                {getPeriodLabel()} Expenses
              </div>
              <div className="text-2xl font-bold text-foreground font-mono">
                {formatCurrency(adjustedExpenses)}
              </div>
              <div className="text-xs text-muted-foreground/80 mt-1">
                Break even target
              </div>
            </CardContent>
          </Card>

          <Card className={cn(
            "shadow-md",
            isSurplus
              ? "bg-gradient-to-br from-success/25 via-status-active/15 to-card"
              : "bg-gradient-to-br from-destructive/25 via-error/15 to-card"
          )}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
                {getPeriodLabel()} Commission
              </div>
              <div className="text-2xl font-bold text-foreground font-mono">
                {formatCurrency(adjustedEarned)}
              </div>
              <div className={cn(
                "text-xs mt-1 flex items-center gap-1",
                isSurplus ? "text-success" : "text-destructive"
              )}>
                {isSurplus ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {isSurplus ? `+${formatCurrency(adjustedSurplus)} surplus` : `${formatCurrency(Math.abs(adjustedSurplus))} deficit`}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-info/20 via-status-earned/15 to-card shadow-md">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
                Pipeline Value
              </div>
              <div className="text-2xl font-bold text-info font-mono">
                {formatCurrency(totalPending)}
              </div>
              <div className="text-xs text-muted-foreground/80 mt-1">
                Pending commissions
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Health Progress Bar */}
        <Card className="bg-gradient-to-br from-accent/10 to-card shadow-md">
          <CardContent className="p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs text-foreground font-semibold uppercase tracking-wide">
                Breakeven Progress
              </span>
              <span className="text-sm text-foreground font-bold">
                {healthPercentage.toFixed(0)}%
              </span>
            </div>

            <div className="w-full h-3 bg-muted rounded-md overflow-hidden shadow-inner">
              <div
                className={cn(
                  "h-full rounded-md transition-all duration-300",
                  healthPercentage >= 100
                    ? "bg-gradient-to-r from-success via-status-active to-success/80"
                    : "bg-gradient-to-r from-primary via-info to-primary/80"
                )}
                style={{ width: `${healthPercentage}%` }}
              />
            </div>

            <div className="text-xs text-muted-foreground/80 mt-2">
              {healthPercentage >= 100
                ? '✓ You have exceeded your breakeven target'
                : `${formatCurrency(adjustedExpenses - adjustedEarned)} needed to break even`}
            </div>
          </CardContent>
        </Card>

        {/* Alert if needed */}
        {healthPercentage < 50 && (
          <Alert className="mt-4 bg-warning/20 shadow-md">
            <AlertDescription className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-warning" />
              <span className="text-sm text-warning font-medium">
                You're below 50% of your breakeven target. Focus on production!
              </span>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
