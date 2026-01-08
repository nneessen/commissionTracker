// src/features/messages/components/linkedin/LinkedInPriorityBadge.tsx
// Priority indicator badge/button for LinkedIn conversations

import { type ReactNode } from "react";
import { Star, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface LinkedInPriorityBadgeProps {
  isPriority: boolean;
  prioritySetAt?: string | null;
  priorityNotes?: string | null;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "badge" | "button";
}

export function LinkedInPriorityBadge({
  isPriority,
  prioritySetAt,
  priorityNotes,
  onClick,
  disabled = false,
  variant = "badge",
}: LinkedInPriorityBadgeProps): ReactNode {
  const tooltipContent = isPriority ? (
    <div className="text-[10px]">
      <p className="font-medium">Priority conversation</p>
      {prioritySetAt && (
        <p className="text-zinc-400">
          Set {format(new Date(prioritySetAt), "MMM d, yyyy")}
        </p>
      )}
      {priorityNotes && <p className="mt-1 text-zinc-300">{priorityNotes}</p>}
      <p className="mt-1 text-zinc-400">Click to remove priority</p>
    </div>
  ) : (
    <p className="text-[10px]">Click to mark as priority</p>
  );

  if (variant === "badge") {
    if (!isPriority) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onClick}
              disabled={disabled}
              className={cn(
                "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full",
                "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
                "hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
              <span className="text-[9px] font-medium">Priority</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>{tooltipContent}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Button variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7",
              isPriority && "text-amber-500 hover:text-amber-600",
            )}
            onClick={onClick}
            disabled={disabled}
          >
            {disabled ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Star
                className={cn(
                  "h-3.5 w-3.5",
                  isPriority && "fill-amber-500 text-amber-500",
                )}
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{tooltipContent}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
