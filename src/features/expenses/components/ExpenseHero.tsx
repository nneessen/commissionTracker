// src/features/expenses/components/ExpenseHero.tsx

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import type { ExpenseTrendData } from '@/types/expense.types';

interface ExpenseHeroProps {
  totalAmount: number;
  previousMonthAmount: number;
  trendData: ExpenseTrendData[];
  isLoading?: boolean;
}

export function ExpenseHero({
  totalAmount,
  previousMonthAmount,
  trendData,
  isLoading,
}: ExpenseHeroProps) {
  const [displayAmount, setDisplayAmount] = useState(0);

  // Animated counter effect
  useEffect(() => {
    if (isLoading) return;

    let start = 0;
    const end = totalAmount;
    const duration = 1500;
    const increment = end / (duration / 16);

    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setDisplayAmount(end);
        clearInterval(timer);
      } else {
        setDisplayAmount(start);
      }
    }, 16);

    return () => clearInterval(timer);
  }, [totalAmount, isLoading]);

  const growthAmount = totalAmount - previousMonthAmount;
  const growthPercent = previousMonthAmount > 0
    ? ((growthAmount / previousMonthAmount) * 100)
    : 0;
  const isPositive = growthAmount > 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const sparklineData = trendData.slice(-12).map((d) => ({ value: d.total }));

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-8 animate-pulse">
        <div className="h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border border-border/50 backdrop-blur-sm">
      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-chart-2/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      <div className="relative p-8">
        <div className="flex items-start justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Total Spending
              </p>
            </div>

            <div className="space-y-2">
              <h2 className="text-6xl font-bold tracking-tight">
                {formatCurrency(displayAmount)}
              </h2>

              <div className="flex items-center gap-3">
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    isPositive
                      ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                      : 'bg-green-500/10 text-green-600 dark:text-green-400'
                  }`}
                >
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span>{Math.abs(growthPercent).toFixed(1)}%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isPositive ? '+' : ''}{formatCurrency(growthAmount)} vs last month
                </p>
              </div>
            </div>
          </div>

          {/* Sparkline */}
          <div className="w-48 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData}>
                <defs>
                  <linearGradient id="sparklineGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#sparklineGradient)"
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
