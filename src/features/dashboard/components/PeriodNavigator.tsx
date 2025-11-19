// src/features/dashboard/components/PeriodNavigator.tsx

import React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../../components/ui/dropdown-menu";
import { TimePeriod, DateRange, getPeriodDescriptor, getDateRange } from "../../../utils/dateRange";
import { cn } from "../../../lib/utils";

interface PeriodNavigatorProps {
  timePeriod: TimePeriod;
  periodOffset: number;
  onOffsetChange: (offset: number) => void;
  dateRange: DateRange;
}

/**
 * PeriodNavigator - Navigation controls for cycling through time periods
 *
 * Features:
 * - Previous/Next arrows for sequential navigation
 * - Clickable period label with dropdown for quick jumps
 * - "Jump to Current" button when viewing historical periods
 * - Next button disabled at current period (no future navigation per requirements)
 */
export const PeriodNavigator: React.FC<PeriodNavigatorProps> = ({
  timePeriod,
  periodOffset,
  onOffsetChange,
  dateRange,
}) => {
  // Generate dropdown options for last 12 periods
  const generateDropdownOptions = () => {
    const options: Array<{ offset: number; label: string }> = [];
    for (let i = 0; i >= -11; i--) {
      const offsetDateRange = getDateRange(timePeriod, i);
      const label = getPeriodDescriptor(timePeriod, i, offsetDateRange);
      options.push({ offset: i, label });
    }
    return options;
  };

  const dropdownOptions = generateDropdownOptions();
  const currentPeriodLabel = getPeriodDescriptor(timePeriod, periodOffset, dateRange);
  const isAtCurrentPeriod = periodOffset === 0;

  const handlePrevious = () => {
    onOffsetChange(periodOffset - 1);
  };

  const handleNext = () => {
    if (periodOffset < 0) {
      onOffsetChange(periodOffset + 1);
    }
  };

  const handleJumpToCurrent = () => {
    onOffsetChange(0);
  };

  const handleSelectFromDropdown = (offset: number) => {
    onOffsetChange(offset);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Previous Button */}
      <Button
        onClick={handlePrevious}
        variant="outline"
        size="sm"
        className="h-8 px-2"
        title="Previous period"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {/* Period Label with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-3 font-medium hover:bg-muted"
            title="Select period"
          >
            {currentPeriodLabel}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-[300px] overflow-y-auto">
          {dropdownOptions.map((option) => (
            <DropdownMenuItem
              key={option.offset}
              onClick={() => handleSelectFromDropdown(option.offset)}
              className={cn(
                "cursor-pointer",
                option.offset === periodOffset && "bg-muted font-semibold"
              )}
            >
              {option.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Next Button - Disabled at current period */}
      <Button
        onClick={handleNext}
        variant="outline"
        size="sm"
        className="h-8 px-2"
        disabled={isAtCurrentPeriod}
        title={isAtCurrentPeriod ? "Already at current period" : "Next period"}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      {/* Jump to Current Button - Only shown when not at current period */}
      {!isAtCurrentPeriod && (
        <Button
          onClick={handleJumpToCurrent}
          variant="outline"
          size="sm"
          className="h-8 px-3 gap-1.5"
          title="Jump to current period"
        >
          <Calendar className="h-3.5 w-3.5" />
          <span className="text-xs">Current</span>
        </Button>
      )}
    </div>
  );
};
