// src/features/underwriting/components/QuickQuote/icon-toggle.tsx

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface IconToggleOption<T extends string> {
  value: T;
  label: string;
  content: ReactNode;
}

interface IconToggleProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: IconToggleOption<T>[];
}

/**
 * A segmented toggle that renders icon/ReactNode content with tooltip labels.
 */
export function IconToggle<T extends string>({
  value,
  onChange,
  options,
}: IconToggleProps<T>) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700 overflow-hidden h-7">
        {options.map((opt, idx) => (
          <Tooltip key={opt.value}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(opt.value)}
                className={cn(
                  "px-2.5 flex items-center justify-center gap-1 text-xs font-medium transition-colors",
                  value === opt.value
                    ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900"
                    : "bg-white text-zinc-500 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800",
                  idx > 0 &&
                    "border-l border-zinc-200 dark:border-zinc-700",
                )}
              >
                {opt.content}
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {opt.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
