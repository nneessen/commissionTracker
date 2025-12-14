// src/features/dashboard/components/TimePeriodSwitcher.tsx

import React from 'react';
import {Button} from '@/components/ui/button';
import {TimePeriodSwitcherProps} from '../../../types/dashboard.types';
import {TimePeriod} from '../../../utils/dateRange';
import {cn} from '@/lib/utils';

/**
 * Time Period Switcher - Compact button group for time period selection
 */
export const TimePeriodSwitcher: React.FC<TimePeriodSwitcherProps> = ({
  timePeriod,
  onTimePeriodChange,
}) => {
  const periods: TimePeriod[] = ['daily', 'weekly', 'monthly', 'yearly'];

  return (
    <div className="flex gap-0.5 bg-muted/30 p-0.5 rounded">
      {periods.map((period) => (
        <Button
          key={period}
          onClick={() => onTimePeriodChange(period)}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 text-[11px] font-medium capitalize rounded-sm",
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
