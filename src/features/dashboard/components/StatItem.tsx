// src/features/dashboard/components/StatItem.tsx

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StatItemConfig } from '../../../types/dashboard.types';
import { MetricTooltip } from '../../../components/ui/MetricTooltip';
import { FONT_SIZES, TYPOGRAPHY } from '../../../constants/dashboard';

/**
 * Stat Item Component
 *
 * Individual stat display with label, value, trend indicator, and optional tooltip.
 * Used within QuickStatsPanel.
 * Extracted from DashboardHome.tsx (lines 594-631).
 */
export const StatItem: React.FC<{ stat: StatItemConfig; showBorder: boolean }> = ({
  stat,
  showBorder,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 0',
        borderBottom: showBorder ? '1px solid #374151' : 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span style={{ fontSize: FONT_SIZES.STAT_LABEL, color: '#cbd5e0' }}>
          {stat.label}
        </span>
        {stat.tooltip && <MetricTooltip {...stat.tooltip} />}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {stat.trend &&
          (stat.trend === 'up' ? (
            <TrendingUp size={10} color="#10b981" />
          ) : (
            <TrendingDown size={10} color="#ef4444" />
          ))}
        <span
          style={{
            fontSize: FONT_SIZES.STAT_VALUE,
            fontWeight: TYPOGRAPHY.HEAVY_FONT_WEIGHT,
            fontFamily: TYPOGRAPHY.MONO_FONT,
            color: stat.color,
          }}
        >
          {stat.value}
        </span>
      </div>
    </div>
  );
};
