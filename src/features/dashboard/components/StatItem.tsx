// src/features/dashboard/components/StatItem.tsx

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StatItemConfig } from '../../../types/dashboard.types';
import { MetricTooltip } from '../../../components/custom_ui/MetricTooltip';
import { cn } from '@/lib/utils';

/**
 * Stat Item Component
 *
 * Individual stat display with label, value, trend indicator, and optional tooltip.
 * Used within QuickStatsPanel.
 * Extracted from DashboardHome.tsx (lines 594-631).
 *
 * Refactored to use Tailwind CSS classes instead of inline styles.
 */
export const StatItem: React.FC<{ stat: StatItemConfig; showBorder: boolean }> = ({
  stat,
  showBorder,
}) => {
  return (
    <div
      className={cn(
        "flex justify-between items-center py-1.5",
        showBorder && "border-b border-card/20"
      )}
    >
      <div className="flex items-center">
        <span className="text-xs text-card/80">
          {stat.label}
        </span>
        {stat.tooltip && <MetricTooltip {...stat.tooltip} />}
      </div>
      <div className="flex items-center gap-1">
        {stat.trend &&
          (stat.trend === 'up' ? (
            <TrendingUp size={10} className="text-success" />
          ) : (
            <TrendingDown size={10} className="text-error" />
          ))}
        <span
          className="text-xs font-extrabold font-mono"
          style={{ color: stat.color }}
        >
          {stat.value}
        </span>
      </div>
    </div>
  );
};
