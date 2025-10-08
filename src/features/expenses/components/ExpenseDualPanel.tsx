// src/features/expenses/components/ExpenseDualPanel.tsx

import { useState } from 'react';
import { Briefcase, User, Receipt, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { CategoryBreakdownData, ExpenseComparisonData } from '@/types/expense.types';

interface ExpenseDualPanelProps {
  categoryData: CategoryBreakdownData[];
  comparisonData: ExpenseComparisonData[];
  deductibleAmount: number;
  isLoading?: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function ExpenseDualPanel({
  categoryData,
  comparisonData,
  deductibleAmount,
  isLoading,
}: ExpenseDualPanelProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const personal = comparisonData.find((d) => d.type === 'personal') || {
    type: 'personal' as const,
    amount: 0,
    count: 0,
    avgAmount: 0,
  };
  const business = comparisonData.find((d) => d.type === 'business') || {
    type: 'business' as const,
    amount: 0,
    count: 0,
    avgAmount: 0,
  };

  const totalAmount = personal.amount + business.amount;
  const pieData = [
    { name: 'Business', value: business.amount, count: business.count },
    { name: 'Personal', value: personal.amount, count: personal.count },
  ];

  const topCategories = categoryData.slice(0, 6);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-64 bg-muted rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Panel - Interactive Donut */}
      <Card className="relative overflow-hidden border-border/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />

        <div className="relative p-6">
          <h3 className="text-lg font-semibold mb-6">Spending Distribution</h3>

          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--chart-2))'}
                      opacity={hoveredIndex === null || hoveredIndex === index ? 1 : 0.5}
                      style={{ transition: 'opacity 0.2s' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Center Stats */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-3xl font-bold">
                  {hoveredIndex !== null
                    ? formatCurrency(pieData[hoveredIndex].value)
                    : formatCurrency(totalAmount)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {hoveredIndex !== null ? pieData[hoveredIndex].name : 'Total'}
                </p>
              </div>
            </div>
          </div>

          {/* Legend with Details */}
          <div className="mt-6 space-y-3">
            <div
              className="flex items-center justify-between p-3 rounded-lg bg-chart-1/10 border border-chart-1/20 cursor-pointer transition-all hover:bg-chart-1/20"
              onMouseEnter={() => setHoveredIndex(0)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-1/20">
                  <Briefcase className="h-4 w-4" style={{ color: 'hsl(var(--chart-1))' }} />
                </div>
                <div>
                  <p className="font-medium">Business</p>
                  <p className="text-xs text-muted-foreground">{business.count} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(business.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {totalAmount > 0 ? ((business.amount / totalAmount) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-between p-3 rounded-lg bg-chart-2/10 border border-chart-2/20 cursor-pointer transition-all hover:bg-chart-2/20"
              onMouseEnter={() => setHoveredIndex(1)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-2/20">
                  <User className="h-4 w-4" style={{ color: 'hsl(var(--chart-2))' }} />
                </div>
                <div>
                  <p className="font-medium">Personal</p>
                  <p className="text-xs text-muted-foreground">{personal.count} transactions</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(personal.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {totalAmount > 0 ? ((personal.amount / totalAmount) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Receipt className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-medium">Tax Deductible</p>
                  <p className="text-xs text-muted-foreground">Eligible for deduction</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(deductibleAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Right Panel - Category Breakdown */}
      <Card className="relative overflow-hidden border-border/50 backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent pointer-events-none" />

        <div className="relative p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Top Categories</h3>
            <Wallet className="h-5 w-5 text-muted-foreground" />
          </div>

          <div className="space-y-4">
            {topCategories.map((category, index) => (
              <div key={category.category} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{category.category}</span>
                    <span className="text-xs text-muted-foreground">({category.count})</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(category.amount)}</span>
                </div>

                <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
                    style={{
                      width: `${category.percentage}%`,
                      backgroundColor: COLORS[index % COLORS.length],
                    }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{category.percentage.toFixed(1)}% of total</span>
                  <span>Avg: {formatCurrency(category.amount / category.count)}</span>
                </div>
              </div>
            ))}
          </div>

          {categoryData.length > 6 && (
            <div className="mt-6 pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground text-center">
                +{categoryData.length - 6} more categories
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
