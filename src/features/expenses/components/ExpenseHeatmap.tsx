// src/features/expenses/components/ExpenseHeatmap.tsx

import { format, subMonths, eachDayOfInterval, startOfWeek, endOfWeek, parseISO, isSameDay } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Activity } from 'lucide-react';
import type { Expense } from '@/types/expense.types';

interface ExpenseHeatmapProps {
  expenses: Expense[];
  isLoading?: boolean;
  months?: number;
}

export function ExpenseHeatmap({ expenses, isLoading, months = 6 }: ExpenseHeatmapProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const today = new Date();
  const startDate = subMonths(today, months);

  // Get all days in range
  const allDays = eachDayOfInterval({
    start: startOfWeek(startDate),
    end: endOfWeek(today),
  });

  // Group expenses by day
  const expensesByDay = new Map<string, number>();
  expenses.forEach((expense) => {
    const expenseDate = parseISO(expense.date);
    const key = format(expenseDate, 'yyyy-MM-dd');
    expensesByDay.set(key, (expensesByDay.get(key) || 0) + expense.amount);
  });

  // Calculate max for color intensity
  const amounts = Array.from(expensesByDay.values());
  const maxAmount = amounts.length > 0 ? Math.max(...amounts) : 1;

  const getIntensity = (amount: number): number => {
    if (amount === 0) return 0;
    const percentage = amount / maxAmount;
    if (percentage < 0.25) return 1;
    if (percentage < 0.5) return 2;
    if (percentage < 0.75) return 3;
    return 4;
  };

  const getColorClass = (intensity: number): string => {
    switch (intensity) {
      case 0:
        return 'bg-muted/30';
      case 1:
        return 'bg-green-200 dark:bg-green-900/40';
      case 2:
        return 'bg-green-400 dark:bg-green-700/60';
      case 3:
        return 'bg-green-600 dark:bg-green-600/80';
      case 4:
        return 'bg-green-700 dark:bg-green-500';
      default:
        return 'bg-muted/30';
    }
  };

  // Group days into weeks
  const weeks: Date[][] = [];
  let currentWeek: Date[] = [];

  allDays.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="h-40 bg-muted rounded-lg" />
      </Card>
    );
  }

  const totalSpending = amounts.reduce((sum, amt) => sum + amt, 0);

  return (
    <Card className="relative overflow-hidden border-border/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Spending Activity</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            Last {months} months · {formatCurrency(totalSpending)} total
          </div>
        </div>

        {/* Heatmap Grid - Weeks across, Days down */}
        <div className="overflow-x-auto">
          <div className="inline-flex gap-1">
            {/* Day labels (vertical) */}
            <div className="flex flex-col gap-1 mr-2">
              <div className="h-3" /> {/* Spacer for month labels */}
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                <div
                  key={day}
                  className="h-3 flex items-center text-[10px] text-muted-foreground"
                  style={{ visibility: i % 2 === 0 ? 'visible' : 'hidden' }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks columns */}
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col gap-1">
                {/* Month label on first week of each month */}
                <div className="h-3 text-[10px] text-muted-foreground">
                  {week[0] && week[0].getDate() <= 7 ? format(week[0], 'MMM') : ''}
                </div>

                {/* Days in week (vertical) */}
                {week.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const amount = expensesByDay.get(key) || 0;
                  const intensity = getIntensity(amount);
                  const isToday = isSameDay(day, today);

                  return (
                    <div
                      key={key}
                      className="group relative"
                      title={`${format(day, 'MMM d, yyyy')}: ${formatCurrency(amount)}`}
                    >
                      <div
                        className={`
                          w-3 h-3 rounded-sm transition-all duration-150
                          ${getColorClass(intensity)}
                          ${isToday ? 'ring-1 ring-primary ring-offset-1 ring-offset-background' : ''}
                          ${amount > 0 ? 'hover:ring-2 hover:ring-primary/50 cursor-pointer' : ''}
                        `}
                      />

                      {/* Tooltip */}
                      {amount > 0 && (
                        <div className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1.5 bg-popover border border-border rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                          <div className="text-xs font-semibold">{format(day, 'EEE, MMM d')}</div>
                          <div className="text-xs text-muted-foreground">{formatCurrency(amount)}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 1, 2, 3, 4].map((level) => (
              <div key={level} className={`w-3 h-3 rounded-sm ${getColorClass(level)}`} />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>
    </Card>
  );
}
