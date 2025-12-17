// src/features/dashboard/components/DateRangeDisplay.tsx

import React from "react";
import {
  TimePeriod,
  formatDateRange,
  type DateRange,
} from "../../../utils/dateRange";

interface DateRangeDisplayProps {
  timePeriod: TimePeriod;
  dateRange: DateRange;
}

export const DateRangeDisplay: React.FC<DateRangeDisplayProps> = ({
  timePeriod,
  dateRange,
}) => {
  const getPeriodDescription = (period: TimePeriod): string => {
    switch (period) {
      case "daily":
        return "Today";
      case "weekly":
        return "Last 7 Days";
      case "monthly":
        return "Month-to-Date";
      case "yearly":
        return "Year-to-Date";
      default:
        return "Current Period";
    }
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px]">
      <span className="font-medium text-zinc-900 dark:text-zinc-100">
        {getPeriodDescription(timePeriod)}
      </span>
      <span className="text-zinc-400 dark:text-zinc-500">•</span>
      <span className="text-zinc-500 dark:text-zinc-400">
        {formatDateRange(dateRange)}
      </span>
    </div>
  );
};
