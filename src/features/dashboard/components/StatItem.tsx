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
    <div className="flex justify-between items-center py-1.5">
      <div className="flex items-center">
        <span className="text-xs text-muted-foreground">{stat.label}</span>
        {stat.tooltip && <MetricTooltip {...stat.tooltip} />}
      </div>
      <div className="flex items-center gap-1">
        {stat.trend &&
          (stat.trend === "up" ? (
            <TrendingUp size={10} className="text-status-active" />
          ) : (
            <TrendingDown size={10} className="text-destructive" />
          ))}
        <span className={`text-xs font-extrabold font-mono ${stat.color}`}>
          {stat.value}
        </span>
      </div>
    </div>
  );
};
