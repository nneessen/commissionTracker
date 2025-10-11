// src/features/dashboard/components/TimePeriodSwitcher.tsx

import React from 'react';
import { TimePeriodSwitcherProps } from '../../../types/dashboard.types';
import { TimePeriod } from '../../../utils/dateRange';
import { TIME_PERIOD_BUTTON, BORDER_RADIUS } from '../../../constants/dashboard';

/**
 * Time Period Switcher Component
 *
 * Button group for selecting time period (daily/weekly/monthly/yearly).
 * Extracted from DashboardHome.tsx (lines 312-352).
 */
export const TimePeriodSwitcher: React.FC<TimePeriodSwitcherProps> = ({
  timePeriod,
  onTimePeriodChange,
}) => {
  const periods: TimePeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        background: '#f1f5f9',
        padding: '4px',
        borderRadius: BORDER_RADIUS.MEDIUM,
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
      }}
    >
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onTimePeriodChange(period)}
          style={{
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 600,
            textTransform: 'capitalize',
            border: 'none',
            borderRadius: BORDER_RADIUS.SMALL,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            background:
              timePeriod === period
                ? TIME_PERIOD_BUTTON.ACTIVE_BG
                : TIME_PERIOD_BUTTON.INACTIVE_BG,
            color:
              timePeriod === period
                ? TIME_PERIOD_BUTTON.ACTIVE_COLOR
                : TIME_PERIOD_BUTTON.INACTIVE_COLOR,
            boxShadow:
              timePeriod === period
                ? TIME_PERIOD_BUTTON.HOVER_SHADOW
                : 'none',
          }}
        >
          {period}
        </button>
      ))}
    </div>
  );
};
