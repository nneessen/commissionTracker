// src/features/dashboard/components/QuickStatsPanel.tsx

import React from 'react';
import { QuickStatsPanelProps } from '../../../types/dashboard.types';
import { StatItem } from './StatItem';

/**
 * Quick Stats Panel Component
 *
 * Left sidebar displaying key metrics with tooltips and trends.
 * Extracted from DashboardHome.tsx (lines 365-632).
 *
 * Refactored to use Tailwind CSS classes instead of inline styles.
 */
export const QuickStatsPanel: React.FC<QuickStatsPanelProps> = ({ stats }) => {
  return (
    <div className="bg-gradient-to-br from-primary to-primary/80 rounded-lg p-4 shadow-lg text-card">
      <div className="text-sm font-semibold mb-3 pb-2 border-b border-card/30 uppercase tracking-wide">
        Key Metrics
      </div>

      {stats.map((stat, index) => (
        <StatItem key={index} stat={stat} showBorder={index < stats.length - 1} />
      ))}
    </div>
  );
};
