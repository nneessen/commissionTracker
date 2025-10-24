// src/features/expenses/components/ExpenseSummaryStats.tsx
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/format";

interface ExpenseSummaryStatsProps {
  totalAmount: number;
  businessAmount: number;
  personalAmount: number;
  transactionCount: number;
  momGrowthPercentage?: number;
}

export function ExpenseSummaryStats({
  totalAmount,
  businessAmount,
  personalAmount,
  transactionCount,
  momGrowthPercentage = 0,
}: ExpenseSummaryStatsProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Summary
        </div>
        {momGrowthPercentage !== 0 && (
          <Badge variant={momGrowthPercentage > 0 ? "destructive" : "default"}>
            {momGrowthPercentage > 0 ? "▲" : "▼"}{" "}
            {Math.abs(momGrowthPercentage).toFixed(1)}% MoM
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <StatCard
          label="Total Expenses"
          value={formatCurrency(totalAmount)}
          variant="highlight"
        />
        <StatCard label="Business" value={formatCurrency(businessAmount)} />
        <StatCard label="Personal" value={formatCurrency(personalAmount)} />
        <div className="pt-3 border-t">
          <StatCard label="Total Transactions" value={transactionCount} />
        </div>
      </CardContent>
    </Card>
  );
}
