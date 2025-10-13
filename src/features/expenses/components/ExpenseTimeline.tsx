// src/features/expenses/components/ExpenseTimeline.tsx

import { format, parseISO } from 'date-fns';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Receipt, Calendar } from 'lucide-react';
import type { Expense } from '@/types/expense.types';

interface ExpenseTimelineProps {
  expenses: Expense[];
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
  limit?: number;
  isLoading?: boolean;
}

export function ExpenseTimeline({
  expenses,
  onEdit,
  onDelete,
  limit = 10,
  isLoading,
}: ExpenseTimelineProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    return {
      day: format(date, 'd'),
      month: format(date, 'MMM'),
      time: format(date, 'h:mm a'),
    };
  };

  const recentExpenses = expenses.slice(0, limit);

  if (isLoading) {
    return (
      <Card className="p-6 animate-pulse">
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </Card>
    );
  }

  if (recentExpenses.length === 0) {
    return (
      <Card className="p-12 text-center">
        <Receipt className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">No expenses yet</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Add your first expense to start tracking your spending
        </p>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden border-border/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-br from-chart-4/5 to-transparent pointer-events-none" />

      <div className="relative p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            <span>Last {limit} expenses</span>
          </div>
        </div>

        <div className="relative space-y-6">
          {/* Timeline line */}
          <div className="absolute left-6 top-4 bottom-4 w-px bg-border" />

          {recentExpenses.map((expense, index) => {
            const date = formatDate(expense.date);

            return (
              <div
                key={expense.id}
                className="group relative pl-14 transition-all duration-200 hover:translate-x-1"
              >
                {/* Date bubble */}
                <div className="absolute left-0 top-0">
                  <div className="flex flex-col items-center">
                    <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-background border-2 border-border shadow-sm">
                      <div className="text-center">
                        <div className="text-xs font-bold leading-none">{date.day}</div>
                        <div className="text-[10px] text-muted-foreground uppercase leading-none mt-0.5">
                          {date.month}
                        </div>
                      </div>
                    </div>

                    {/* Connection dot */}
                    {index < recentExpenses.length - 1 && (
                      <div className="absolute top-12 w-px h-6 bg-border" />
                    )}
                  </div>
                </div>

                {/* Content card */}
                <div className="relative rounded-lg border border-border/50 bg-card p-4 shadow-sm transition-all duration-200 group-hover:shadow-md group-hover:border-border">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{expense.name}</h4>
                        <Badge
                          variant={expense.expense_type === 'business' ? 'default' : 'secondary'}
                          className={
                            expense.expense_type === 'business'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400'
                          }
                        >
                          {expense.expense_type === 'business' ? 'Business' : 'Personal'}
                        </Badge>
                      </div>

                      {expense.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                          {expense.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {expense.category}
                        </Badge>
                        {expense.is_tax_deductible && (
                          <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                            Tax Deductible
                          </Badge>
                        )}
                        {expense.is_recurring && (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                            Recurring
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xl font-bold whitespace-nowrap">
                        {formatCurrency(expense.amount)}
                      </div>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(expense)}
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => onDelete(expense)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {expenses.length > limit && (
          <div className="mt-6 pt-4 border-t border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              Showing {limit} of {expenses.length} expenses
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
