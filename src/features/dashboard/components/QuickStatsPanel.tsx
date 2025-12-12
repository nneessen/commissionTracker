// src/features/dashboard/components/QuickStatsPanel.tsx

import React from 'react';
import {QuickStatsPanelProps} from '../../../types/dashboard.types';
import {StatItem} from './StatItem';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

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
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm uppercase tracking-wide">
          Key Metrics
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">

        {stats.map((stat, index) => (
          <StatItem key={index} stat={stat} showBorder={index < stats.length - 1} />
        ))}
      </CardContent>
    </Card>
  );
};
