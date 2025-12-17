// src/features/dashboard/components/TimePeriodSwitcher.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { TimePeriodSwitcherProps } from "../../../types/dashboard.types";
import { TimePeriod } from "../../../utils/dateRange";
import { cn } from "@/lib/utils";

/**
 * Time Period Switcher - Compact zinc-styled tab bar
 */
export const TimePeriodSwitcher: React.FC<TimePeriodSwitcherProps> = ({
  timePeriod,
  onTimePeriodChange,
}) => {
  const periods: TimePeriod[] = ["daily", "weekly", "monthly", "yearly"];

  return (
    <div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5">
      {periods.map((period) => (
        <Button
          key={period}
          onClick={() => onTimePeriodChange(period)}
          variant="ghost"
          size="sm"
          className={cn(
            "h-6 px-2 text-[10px] font-medium capitalize rounded transition-all",
            timePeriod === period
              ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
              : "bg-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
          )}
        >
          {period}
        </Button>
      ))}
    </div>
  );
};
