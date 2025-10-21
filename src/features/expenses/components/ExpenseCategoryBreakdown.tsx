// src/features/expenses/components/ExpenseCategoryBreakdown.tsx
import {
  Card,
  CardHeader,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Empty as EmptyState } from "@/components/ui/empty";
import { formatCurrency } from "@/lib/format";

interface CategoryData {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}

interface ExpenseCategoryBreakdownProps {
  categories: CategoryData[];
}

// Map colors to Tailwind background classes
const colorToBgClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    'rgb(59, 130, 246)': 'bg-blue-500',
    'rgb(16, 185, 129)': 'bg-green-500',
    'rgb(245, 158, 11)': 'bg-amber-500',
    'rgb(239, 68, 68)': 'bg-red-500',
    'rgb(139, 92, 246)': 'bg-purple-500',
    'rgb(236, 72, 153)': 'bg-pink-500',
    'rgb(6, 182, 212)': 'bg-cyan-500',
    'rgb(20, 184, 166)': 'bg-teal-500',
    'rgb(249, 115, 22)': 'bg-orange-500',
    'rgb(100, 116, 139)': 'bg-slate-500',
  };
  return colorMap[color] || 'bg-blue-500';
};

export function ExpenseCategoryBreakdown({
  categories,
}: ExpenseCategoryBreakdownProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Category Breakdown
        </div>
        <CardDescription className="text-xs">
          Spending distribution by category
        </CardDescription>
      </CardHeader>
      <CardContent>
        {categories.length > 0 ? (
          <div className="space-y-2">
            {categories.map((cat, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{cat.category}</span>
                  <span className="font-mono font-semibold">
                    {formatCurrency(cat.amount)} ({cat.percentage.toFixed(0)}%)
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${colorToBgClass(cat.color)}`}
                    style={{ width: `${cat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No data to display" />
        )}
      </CardContent>
    </Card>
  );
}
