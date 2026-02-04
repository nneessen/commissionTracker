// src/features/policies/components/SubmitDateConfirmDialog.tsx

import { useState } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2 } from "lucide-react";
import { formatDateForDB } from "@/lib/date";

interface SubmitDateConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmToday: () => void;
  onSelectDate: (date: string) => void;
  isSubmitting: boolean;
}

export function SubmitDateConfirmDialog({
  open,
  onOpenChange,
  onConfirmToday,
  onSelectDate,
  isSubmitting,
}: SubmitDateConfirmDialogProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState("");

  // Reset state when dialog opens/closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setShowDatePicker(false);
      setSelectedDate("");
    }
    onOpenChange(newOpen);
  };

  const handleSelectDifferentDate = () => {
    setShowDatePicker(true);
    // Default to yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDate(formatDateForDB(yesterday));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(e.target.value);
  };

  const handleSubmitWithDate = () => {
    if (selectedDate) {
      onSelectDate(selectedDate);
    }
  };

  // Get max date (yesterday) for the date picker
  const getMaxDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return formatDateForDB(yesterday);
  };

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialogPrimitive.Portal>
        {/* Overlay with higher z-index to render above parent Dialog (z-100) */}
        <AlertDialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-[200] bg-black/80",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        {/* Content with higher z-index */}
        <AlertDialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-[200] grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%]",
            "gap-4 border p-4 shadow-lg duration-200 sm:rounded-lg",
            "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
            "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          )}
        >
          {/* Header */}
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <AlertDialogPrimitive.Title className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <Calendar className="h-4 w-4 text-amber-500" />
              Confirm Submit Date
            </AlertDialogPrimitive.Title>
            <AlertDialogPrimitive.Description className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {showDatePicker
                ? "Select the actual date this policy was written:"
                : "The submit date is set to today. Was this policy actually written today?"}
            </AlertDialogPrimitive.Description>
          </div>

          {showDatePicker ? (
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor="actualSubmitDate"
                  className="text-[11px] text-muted-foreground"
                >
                  Actual Submit Date
                </Label>
                <Input
                  id="actualSubmitDate"
                  type="date"
                  value={selectedDate}
                  onChange={handleDateChange}
                  max={getMaxDate()}
                  className="h-8 text-[11px]"
                  autoFocus
                />
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-950/30 p-2.5">
              <p className="text-[10px] text-amber-700 dark:text-amber-400">
                If you&apos;re entering an older policy, select &quot;No, different
                day&quot; to set the correct date.
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-1.5">
            {showDatePicker ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDatePicker(false)}
                  disabled={isSubmitting}
                  className="h-7 px-2 text-[10px]"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmitWithDate}
                  disabled={isSubmitting || !selectedDate}
                  className="h-7 px-3 text-[10px] bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Use This Date"
                  )}
                </Button>
              </>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectDifferentDate}
                  disabled={isSubmitting}
                  className="h-7 px-2 text-[10px] border-zinc-200 dark:border-zinc-700"
                >
                  No, different day
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={onConfirmToday}
                  disabled={isSubmitting}
                  className="h-7 px-3 text-[10px] bg-amber-500 hover:bg-amber-600 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Yes, written today"
                  )}
                </Button>
              </>
            )}
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}
