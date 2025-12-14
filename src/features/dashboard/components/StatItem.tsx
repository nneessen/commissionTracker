// src/features/dashboard/components/StatItem.tsx

import React from "react";
import {TrendingUp, TrendingDown} from "lucide-react";
import {StatItemConfig} from "../../../types/dashboard.types";
import {MetricTooltip} from "../../../components/ui/MetricTooltip";

export const StatItem: React.FC<{
  stat: StatItemConfig;
  showBorder: boolean;
}> = ({ stat }) => {
  return (
    <div className="flex justify-between items-center py-1 hover:bg-muted/20 rounded px-1 -mx-1">
      <div className="flex items-center gap-1">
        <span className="text-[11px] text-muted-foreground">{stat.label}</span>
        {stat.tooltip && <MetricTooltip {...stat.tooltip} />}
      </div>
      <div className="flex items-center gap-1">
        {stat.trend &&
          (stat.trend === "up" ? (
            <TrendingUp size={10} className="text-success" />
          ) : (
            <TrendingDown size={10} className="text-error" />
          ))}
        <span className={`text-[11px] font-semibold font-mono ${stat.color}`}>
          {stat.value}
        </span>
      </div>
    </div>
  );
};
