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
    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/20 rounded text-[11px] text-muted-foreground">
      <span className="font-medium text-foreground">{getPeriodDescription(timePeriod)}</span>
      <span className="text-muted-foreground/50">•</span>
      <span>{formatDateRange(dateRange)}</span>
    </div>
  );
};
