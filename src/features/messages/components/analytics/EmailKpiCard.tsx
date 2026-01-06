// src/features/messages/components/analytics/EmailKpiCard.tsx
// Email KPI card showing sent, open rate, click rate

import { Mail, TrendingUp, MousePointer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { EmailAnalytics } from "../../hooks/useMessagingAnalytics";

interface EmailKpiCardProps {
  data?: EmailAnalytics;
}

export function EmailKpiCard({ data }: EmailKpiCardProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
              <Mail className="h-3 w-3 text-blue-500" />
            </div>
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Email
            </span>
          </div>
        </div>

        {/* Main Metric */}
        <div className="mb-2">
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {data?.totalSent ?? 0}
          </p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            emails sent
          </p>
        </div>

        {/* Sub Metrics */}
        <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <TrendingUp className="h-2.5 w-2.5" />
              Open rate
            </span>
            <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
              {data?.openRate ?? 0}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <MousePointer className="h-2.5 w-2.5" />
              Click rate
            </span>
            <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
              {data?.clickRate ?? 0}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
