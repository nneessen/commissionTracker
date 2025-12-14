// src/features/dashboard/components/QuickStatsPanel.tsx

import React from 'react';
import {QuickStatsPanelProps} from '../../../types/dashboard.types';
import {StatItem} from './StatItem';
import {Card, CardContent} from '@/components/ui/card';

/**
 * Quick Stats Panel - Clean, compact design matching Targets/Expenses pages
 */
export const QuickStatsPanel: React.FC<QuickStatsPanelProps> = ({ stats }) => {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Key Metrics</div>
        <div className="space-y-0.5">
          {stats.map((stat, index) => (
            <StatItem key={index} stat={stat} showBorder={index < stats.length - 1} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
