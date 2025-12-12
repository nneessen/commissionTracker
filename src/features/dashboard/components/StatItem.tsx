// src/features/dashboard/components/StatItem.tsx

import React from "react";
import {TrendingUp, TrendingDown} from "lucide-react";
import {StatItemConfig} from "../../../types/dashboard.types";
import {MetricTooltip} from "../../../components/ui/MetricTooltip";

const colorToClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    "rgb(16, 185, 129)": "text-status-active", // Green
    "rgb(59, 130, 246)": "text-status-earned", // Blue
    "rgb(245, 158, 11)": "text-status-pending", // Amber
    "rgb(239, 68, 68)": "text-destructive", // Red
    "rgb(139, 92, 246)": "text-primary", // Purple
    "rgb(6, 182, 212)": "text-primary", // Cyan
    "rgb(100, 116, 139)": "text-muted-foreground", // Slate
    "rgb(236, 72, 153)": "text-primary", // Pink
    "rgb(168, 85, 247)": "text-primary", // Purple
    "rgb(14, 165, 233)": "text-primary", // Sky
    "rgb(20, 184, 166)": "text-status-active", // Teal
    "rgb(249, 115, 22)": "text-status-lapsed", // Orange
  };
  return colorMap[color] || "text-foreground";
};

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
        <span
          className={`text-xs font-extrabold font-mono ${colorToClass(stat.color)}`}
        >
          {stat.value}
        </span>
      </div>
    </div>
  );
};
