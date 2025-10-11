// src/features/dashboard/components/QuickStatsPanel.tsx

import React from 'react';
import { QuickStatsPanelProps } from '../../../types/dashboard.types';
import { StatItem } from './StatItem';
import { GRADIENTS, BORDER_RADIUS, SHADOWS, FONT_SIZES } from '../../../constants/dashboard';

/**
 * Quick Stats Panel Component
 *
 * Left sidebar displaying key metrics with tooltips and trends.
 * Extracted from DashboardHome.tsx (lines 365-632).
 */
export const QuickStatsPanel: React.FC<QuickStatsPanelProps> = ({ stats }) => {
  return (
    <div
      style={{
        background: GRADIENTS.DARK_SIDEBAR,
        borderRadius: BORDER_RADIUS.LARGE,
        padding: '16px',
        boxShadow: SHADOWS.SIDEBAR,
        color: '#f8f9fa',
      }}
    >
      <div
        style={{
          fontSize: FONT_SIZES.SUBSECTION_HEADER,
          fontWeight: 600,
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid #4a5568',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}
      >
        Key Metrics
      </div>

      {stats.map((stat, index) => (
        <StatItem key={index} stat={stat} showBorder={index < stats.length - 1} />
      ))}
    </div>
  );
};
