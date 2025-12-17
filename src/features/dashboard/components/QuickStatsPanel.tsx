// src/features/dashboard/components/QuickStatsPanel.tsx

import React from "react";
import { QuickStatsPanelProps } from "../../../types/dashboard.types";
import { StatItem } from "./StatItem";

/**
 * Quick Stats Panel - Compact zinc-styled design
 */
export const QuickStatsPanel: React.FC<QuickStatsPanelProps> = ({ stats }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
        Key Metrics
      </div>
      <div className="space-y-0.5">
        {stats.map((stat, index) => (
          <StatItem
            key={index}
            stat={stat}
            showBorder={index < stats.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
