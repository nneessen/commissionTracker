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
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
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
