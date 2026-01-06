// src/features/messages/components/analytics/QuotaUsageCard.tsx
// Daily quota usage card

import { Gauge } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface QuotaUsageCardProps {
  dailyUsed: number;
  dailyLimit: number;
  remaining: number;
}

export function QuotaUsageCard({
  dailyUsed,
  dailyLimit,
  remaining,
}: QuotaUsageCardProps) {
  const percentUsed = dailyLimit > 0 ? (dailyUsed / dailyLimit) * 100 : 0;
  const isWarning = percentUsed >= 80;
  const isCritical = percentUsed >= 95;

  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
              <Gauge className="h-3 w-3 text-amber-500" />
            </div>
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Quota
            </span>
          </div>
        </div>

        {/* Main Metric */}
        <div className="mb-2">
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {dailyUsed}/{dailyLimit}
          </p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            daily emails
          </p>
        </div>

        {/* Progress Bar */}
        <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                isCritical
                  ? "bg-red-500"
                  : isWarning
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${Math.min(percentUsed, 100)}%` }}
            />
          </div>
          <p
            className={`text-[10px] mt-1 ${
              isCritical
                ? "text-red-500"
                : isWarning
                  ? "text-amber-500"
                  : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            {remaining} remaining today
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
