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

// Map colors to Tailwind classes
const colorToClass = (color: string): string => {
  const colorMap: Record<string, string> = {
    'rgb(16, 185, 129)': 'text-green-500',
    'rgb(59, 130, 246)': 'text-blue-500',
    'rgb(245, 158, 11)': 'text-amber-500',
    'rgb(239, 68, 68)': 'text-red-500',
    'rgb(139, 92, 246)': 'text-purple-500',
    'rgb(6, 182, 212)': 'text-cyan-500',
    'rgb(100, 116, 139)': 'text-slate-500',
    'rgb(236, 72, 153)': 'text-pink-500',
    'rgb(168, 85, 247)': 'text-purple-500',
    'rgb(14, 165, 233)': 'text-sky-500',
    'rgb(20, 184, 166)': 'text-teal-500',
    'rgb(249, 115, 22)': 'text-orange-500',
  };
  return colorMap[color] || 'text-foreground';
};

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
          className={`text-xs font-extrabold font-mono ${colorToClass(stat.color)}`}
        >
          {stat.value}
        </span>
      </div>
    </div>
  );
};
