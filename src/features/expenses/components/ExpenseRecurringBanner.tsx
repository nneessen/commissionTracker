// src/features/expenses/components/ExpenseRecurringBanner.tsx
import { Button } from "@/components/ui/button";

interface ExpenseRecurringBannerProps {
  templateCount: number;
  monthYear: string;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function ExpenseRecurringBanner({
  templateCount,
  monthYear,
  onGenerate,
  isGenerating,
}: ExpenseRecurringBannerProps) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-yellow-50 border-2 border-yellow-500 rounded-lg">
      <div>
        <div className="text-xs font-semibold text-yellow-900 mb-1">
          ⚠️ Recurring Expenses Need Generation
        </div>
        <div className="text-xs text-yellow-800">
          You have {templateCount} recurring template
          {templateCount !== 1 ? "s" : ""} but no recurring expenses for{" "}
          {monthYear}. Click to generate them now.
        </div>
      </div>
      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        size="sm"
        className="bg-yellow-500 hover:bg-yellow-600 whitespace-nowrap"
      >
        {isGenerating ? "Generating..." : "Generate Now"}
      </Button>
    </div>
  );
}
