// src/features/dashboard/components/StatItem.tsx

import React from "react";
import { TrendingUp, TrendingDown, Lock } from "lucide-react";
import { StatItemConfig } from "../../../types/dashboard.types";
import { MetricTooltip } from "../../../components/ui/MetricTooltip";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const StatItem: React.FC<{
  stat: StatItemConfig;
  showBorder: boolean;
}> = ({ stat }) => {
  // Handle gated stats
  if (stat.gated) {
    return (
      <div className="flex justify-between items-center py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded px-1 -mx-1">
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
            {stat.label}
          </span>
          {stat.tooltip && <MetricTooltip {...stat.tooltip} />}
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1 cursor-help">
                <span className="text-[11px] font-semibold font-mono text-zinc-400 dark:text-zinc-500">
                  —
                </span>
                <Lock className="h-2.5 w-2.5 text-zinc-400 dark:text-zinc-500" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              <p>{stat.gatedTooltip || "Upgrade to unlock"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div className="flex justify-between items-center py-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded px-1 -mx-1">
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
          {stat.label}
        </span>
        {stat.tooltip && <MetricTooltip {...stat.tooltip} />}
      </div>
      <div className="flex items-center gap-1">
        {stat.trend &&
          (stat.trend === "up" ? (
            <TrendingUp
              size={10}
              className="text-emerald-600 dark:text-emerald-400"
            />
          ) : (
            <TrendingDown
              size={10}
              className="text-red-600 dark:text-red-400"
            />
          ))}
        <span className={`text-[11px] font-semibold font-mono ${stat.color}`}>
          {stat.value}
        </span>
      </div>
    </div>
  );
};
