// src/features/expenses/components/ExpenseRecurringBanner.tsx
import {Button} from "@/components/ui/button";
import {Alert, AlertDescription} from "@/components/ui/alert";

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
    <Alert className="bg-status-pending-bg border-status-pending">
      <AlertDescription className="flex items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-status-pending mb-1">
            ⚠️ Recurring Expenses Need Generation
          </div>
          <div className="text-xs text-status-pending/80">
            You have {templateCount} recurring template
            {templateCount !== 1 ? "s" : ""} but no recurring expenses for{" "}
            {monthYear}. Click to generate them now.
          </div>
        </div>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          size="sm"
          className="bg-status-pending hover:bg-status-pending/90 whitespace-nowrap"
        >
          {isGenerating ? "Generating..." : "Generate Now"}
        </Button>
      </AlertDescription>
    </Alert>
  );
}
