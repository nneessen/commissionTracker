// src/features/dashboard/components/StatItem.tsx

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { StatItemConfig } from "../../../types/dashboard.types";
import { MetricTooltip } from "../../../components/ui/MetricTooltip";

export const StatItem: React.FC<{
  stat: StatItemConfig;
  showBorder: boolean;
}> = ({ stat }) => {
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
