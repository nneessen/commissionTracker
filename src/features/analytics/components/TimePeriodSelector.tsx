// src/features/analytics/components/TimePeriodSelector.tsx

import React from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type AdvancedTimePeriod =
  | "MTD" // Month to Date
  | "YTD" // Year to Date
  | "L30" // Last 30 days
  | "L60" // Last 60 days
  | "L90" // Last 90 days
  | "L12M" // Last 12 months
  | "CUSTOM"; // Custom range

export interface AdvancedDateRange {
  startDate: Date;
  endDate: Date;
  period: AdvancedTimePeriod;
}

interface TimePeriodSelectorProps {
  selectedPeriod: AdvancedTimePeriod;
  onPeriodChange: (period: AdvancedTimePeriod) => void;
  customRange?: { startDate: Date; endDate: Date };
  onCustomRangeChange?: (range: { startDate: Date; endDate: Date }) => void;
}

/**
 * Get date range for advanced time period
 */
export function getAdvancedDateRange(
  period: AdvancedTimePeriod,
  customRange?: { startDate: Date; endDate: Date },
): AdvancedDateRange {
  // Create stable dates at midnight to prevent re-renders
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999); // End of day for proper date range

  let startDate: Date;

  switch (period) {
    case "MTD":
      // Month to date
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;

    case "YTD":
      // Year to date
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      break;

    case "L30":
      // Last 30 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      startDate.setHours(0, 0, 0, 0);
      break;

    case "L60":
      // Last 60 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 60);
      startDate.setHours(0, 0, 0, 0);
      break;

    case "L90":
      // Last 90 days
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      startDate.setHours(0, 0, 0, 0);
      break;

    case "L12M":
      // Last 12 months
      startDate = new Date(now);
      startDate.setFullYear(startDate.getFullYear() - 1);
      startDate.setHours(0, 0, 0, 0);
      break;

    case "CUSTOM":
      // Custom range
      if (customRange) {
        return {
          startDate: customRange.startDate,
          endDate: customRange.endDate,
          period,
        };
      }
      // Default to MTD if no custom range provided
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      break;

    default:
      // Default to MTD
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }

  return { startDate, endDate, period };
}

/**
 * Format date range for display
 */
export function formatAdvancedDateRange(range: AdvancedDateRange): string {
  const start = format(range.startDate, "MMM d, yyyy");
  const end = format(range.endDate, "MMM d, yyyy");

  // If same day, just show one date
  if (start === end) {
    return start;
  }

  // If same year, optimize display
  if (range.startDate.getFullYear() === range.endDate.getFullYear()) {
    const startNoYear = format(range.startDate, "MMM d");
    return `${startNoYear} - ${end}`;
  }

  return `${start} - ${end}`;
}

/**
 * Time Period Selector Component - Zinc styled tab bar
 */
export function TimePeriodSelector({
  selectedPeriod,
  onPeriodChange,
  customRange,
  onCustomRangeChange,
}: TimePeriodSelectorProps) {
  const [showCustomPicker, setShowCustomPicker] = React.useState(false);

  const periods: { value: AdvancedTimePeriod; label: string }[] = [
    { value: "MTD", label: "MTD" },
    { value: "YTD", label: "YTD" },
    { value: "L30", label: "30D" },
    { value: "L60", label: "60D" },
    { value: "L90", label: "90D" },
    { value: "L12M", label: "12M" },
    { value: "CUSTOM", label: "Custom" },
  ];

  const currentRange = getAdvancedDateRange(selectedPeriod, customRange);
  const _displayRange = formatAdvancedDateRange(currentRange);

  return (
    <div className="relative">
      <div className="flex items-center gap-0.5 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-md p-0.5">
        {periods.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              onPeriodChange(value);
              if (value === "CUSTOM") {
                setShowCustomPicker(true);
              } else {
                setShowCustomPicker(false);
              }
            }}
            className={cn(
              "px-2 py-1 text-[10px] font-medium rounded transition-all whitespace-nowrap",
              selectedPeriod === value
                ? "bg-white dark:bg-zinc-900 shadow-sm text-zinc-900 dark:text-zinc-100"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date picker */}
      {showCustomPicker &&
        selectedPeriod === "CUSTOM" &&
        onCustomRangeChange && (
          <div className="absolute top-full right-0 mt-2 p-3 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-lg z-50">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={
                    customRange
                      ? format(customRange.startDate, "yyyy-MM-dd")
                      : format(new Date(), "yyyy-MM-dd")
                  }
                  onChange={(e) => {
                    // Parse date string to create local date at start of day
                    const [year, month, day] = e.target.value
                      .split("-")
                      .map(Number);
                    const newStart = new Date(year, month - 1, day, 0, 0, 0, 0);
                    onCustomRangeChange({
                      startDate: newStart,
                      endDate: customRange?.endDate || new Date(),
                    });
                  }}
                  className="w-full px-2 py-1 text-[11px] text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={
                    customRange
                      ? format(customRange.endDate, "yyyy-MM-dd")
                      : format(new Date(), "yyyy-MM-dd")
                  }
                  onChange={(e) => {
                    // Parse date string to create local date at end of day
                    const [year, month, day] = e.target.value
                      .split("-")
                      .map(Number);
                    const newEnd = new Date(
                      year,
                      month - 1,
                      day,
                      23,
                      59,
                      59,
                      999,
                    );
                    onCustomRangeChange({
                      startDate: customRange?.startDate || new Date(),
                      endDate: newEnd,
                    });
                  }}
                  className="w-full px-2 py-1 text-[11px] text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded"
                />
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
