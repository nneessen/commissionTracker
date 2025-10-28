// src/components/ui/date-range-picker.tsx

import * as React from "react";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  parseLocalDate,
  formatDateForDB,
  formatDateForDisplay,
} from "@/lib/date";

interface DateRangePickerProps {
  value?: { from: Date | undefined; to: Date | undefined };
  onChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
  fromDate?: Date;
  toDate?: Date;
  disabledDays?: Date[];
}

export function DateRangePicker({
  value,
  onChange,
  disabled = false,
  placeholder = "Select date range",
  className,
  align = "start",
  fromDate,
  toDate,
  disabledDays,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);
  const [hoveredDate, setHoveredDate] = React.useState<Date | undefined>();

  // Internal state for date range
  const [range, setRange] = React.useState<DateRange | undefined>(
    value
      ? {
          from: value.from,
          to: value.to,
        }
      : undefined
  );

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value) {
      setRange({
        from: value.from,
        to: value.to,
      });
    }
  }, [value]);

  // Calculate preview range for hover effect
  const previewRange = React.useMemo(() => {
    if (range?.from && !range?.to && hoveredDate) {
      const start = range.from;
      const end = hoveredDate;
      return {
        from: start <= end ? start : end,
        to: start <= end ? end : start,
      };
    }
    return undefined;
  }, [range, hoveredDate]);

  // Format the display text
  const displayText = React.useMemo(() => {
    if (!range?.from) {
      return <span className="text-muted-foreground">{placeholder}</span>;
    }

    if (range.to) {
      return (
        <>
          {formatDateForDisplay(range.from)} -{" "}
          {formatDateForDisplay(range.to)}
        </>
      );
    }

    return formatDateForDisplay(range.from);
  }, [range, placeholder]);

  const handleSelect = (newRange: DateRange | undefined) => {
    setRange(newRange);

    // If both dates are selected, close the popover and trigger onChange
    if (newRange?.from && newRange?.to) {
      setOpen(false);
      onChange?.({
        from: newRange.from,
        to: newRange.to,
      });
    } else if (newRange?.from && !newRange?.to) {
      // Keep popover open for selecting the end date
      onChange?.({
        from: newRange.from,
        to: undefined,
      });
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRange(undefined);
    setHoveredDate(undefined);
    onChange?.({
      from: undefined,
      to: undefined,
    });
  };

  // Preset date ranges
  const presets = [
    {
      label: "Last 7 days",
      getValue: () => {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 7);
        return { from: weekAgo, to: today };
      },
    },
    {
      label: "Last 30 days",
      getValue: () => {
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setDate(today.getDate() - 30);
        return { from: monthAgo, to: today };
      },
    },
    {
      label: "This month",
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { from: firstDay, to: lastDay };
      },
    },
    {
      label: "Last month",
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: firstDay, to: lastDay };
      },
    },
    {
      label: "Year to date",
      getValue: () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), 0, 1);
        return { from: firstDay, to: today };
      },
    },
  ];

  // Check if we're on mobile (simple check, can be enhanced)
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[280px] justify-start text-left font-normal",
            !range && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {displayText}
          {range?.from && (
            <X
              className="ml-auto h-4 w-4 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "w-auto p-0",
          isMobile && "w-screen"
        )}
        align={align}
      >
        <div className="flex flex-col">
          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2 border-b p-3">
            {presets.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                size="sm"
                onClick={() => {
                  const range = preset.getValue();
                  setRange(range);
                  onChange?.(range);
                  setOpen(false);
                }}
                className="h-7 text-xs"
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendar */}
          <Calendar
            mode="range"
            defaultMonth={range?.from || new Date()}
            selected={range}
            onSelect={handleSelect}
            numberOfMonths={isMobile ? 1 : 2}
            disabled={disabledDays}
            fromDate={fromDate}
            toDate={toDate}
            className="p-3"
            classNames={{
              day_selected: cn(
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground"
              ),
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_range_middle: cn(
                "aria-selected:bg-accent aria-selected:text-accent-foreground",
                previewRange && "hover:bg-accent/50"
              ),
              day_range_start: "rounded-l-md",
              day_range_end: "rounded-r-md",
              day_hidden: "invisible",
            }}
            modifiers={{
              preview: previewRange
                ? {
                    from: previewRange.from,
                    to: previewRange.to,
                  }
                : undefined,
            }}
            modifiersClassNames={{
              preview: "bg-accent/50",
            }}
            onDayMouseEnter={(date) => {
              if (range?.from && !range?.to) {
                setHoveredDate(date);
              }
            }}
            onDayMouseLeave={() => {
              setHoveredDate(undefined);
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}