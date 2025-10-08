// src/features/expenses/components/ExpenseSummaryCards.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Calendar } from 'lucide-react';
import type { ExpenseTotals } from '@/types/expense.types';

interface ExpenseSummaryCardsProps {
  totals: ExpenseTotals | undefined;
  isLoading: boolean;
}

export function ExpenseSummaryCards({ totals, isLoading }: ExpenseSummaryCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-gray-200 rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Personal Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Personal Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">
            {formatCurrency(totals?.personal || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Personal spending</p>
        </CardContent>
      </Card>

      {/* Business Expenses */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Business Expenses</CardTitle>
          <TrendingUp className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(totals?.business || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Business spending</p>
        </CardContent>
      </Card>

      {/* Tax Deductible */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Tax Deductible</CardTitle>
          <DollarSign className="h-4 w-4 text-purple-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">
            {formatCurrency(totals?.deductible || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Deductible amount</p>
        </CardContent>
      </Card>

      {/* This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Month</CardTitle>
          <Calendar className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(totals?.monthlyTotal || 0)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Monthly total</p>
        </CardContent>
      </Card>
    </div>
  );
}