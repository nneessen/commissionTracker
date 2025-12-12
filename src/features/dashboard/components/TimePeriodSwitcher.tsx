// src/features/dashboard/components/TimePeriodSwitcher.tsx

import React from 'react';
import {Button} from '@/components/ui/button';
import {TimePeriodSwitcherProps} from '../../../types/dashboard.types';
import {TimePeriod} from '../../../utils/dateRange';
import {cn} from '@/lib/utils';

/**
 * Time Period Switcher Component
 *
 * Button group for selecting time period (daily/weekly/monthly/yearly).
 * Extracted from DashboardHome.tsx (lines 312-352).
 *
 * Refactored to use Tailwind CSS classes instead of inline styles.
 */
export const TimePeriodSwitcher: React.FC<TimePeriodSwitcherProps> = ({
  timePeriod,
  onTimePeriodChange,
}) => {
  const periods: TimePeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

  return (
    <div className="flex gap-1 bg-muted/30 p-1 rounded-md shadow-inner">
      {periods.map((period) => (
        <Button
          key={period}
          onClick={() => onTimePeriodChange(period)}
          variant="ghost"
          size="sm"
          className={cn(
            "px-4 py-2 text-xs font-semibold capitalize h-auto rounded-sm transition-all duration-200",
            timePeriod === period
              ? "bg-card text-foreground shadow-sm"
              : "bg-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {period}
        </Button>
      ))}
    </div>
  );
};
