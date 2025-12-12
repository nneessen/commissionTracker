// src/features/expenses/components/ExpenseMonthSelector.tsx
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardHeader} from "@/components/ui/card";

interface ExpenseMonthSelectorProps {
  selectedMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onExport: () => void;
}

export function ExpenseMonthSelector({
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onExport,
}: ExpenseMonthSelectorProps) {
  const monthYear = selectedMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Selected Month
        </div>
        <Button size="sm" variant="secondary" onClick={onExport}>
          📊 Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={onPrevMonth}>
            ◄
          </Button>
          <div className="flex-1 text-center text-base font-semibold">
            {monthYear}
          </div>
          <Button variant="outline" size="sm" onClick={onToday}>
            Today
          </Button>
          <Button variant="outline" size="sm" onClick={onNextMonth}>
            ►
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
