// src/features/messages/components/analytics/SlackKpiCard.tsx
// Slack KPI card showing sent and success rate

import { MessageSquare, CheckCircle, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { SlackAnalytics } from "../../hooks/useMessagingAnalytics";

interface SlackKpiCardProps {
  data?: SlackAnalytics;
}

export function SlackKpiCard({ data }: SlackKpiCardProps) {
  return (
    <Card className="border-zinc-200 dark:border-zinc-800">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <div className="h-6 w-6 rounded bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
              <MessageSquare className="h-3 w-3 text-purple-500" />
            </div>
            <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
              Slack
            </span>
          </div>
        </div>

        {/* Main Metric */}
        <div className="mb-2">
          <p className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            {data?.totalSent ?? 0}
          </p>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
            messages sent
          </p>
        </div>

        {/* Sub Metrics */}
        <div className="space-y-1 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <CheckCircle className="h-2.5 w-2.5" />
              Success rate
            </span>
            <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
              {data?.successRate ?? 0}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
              <XCircle className="h-2.5 w-2.5" />
              Failed
            </span>
            <span className="text-[10px] font-medium text-zinc-700 dark:text-zinc-300">
              {data?.failed ?? 0}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
