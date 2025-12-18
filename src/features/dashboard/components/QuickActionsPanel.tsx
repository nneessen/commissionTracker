// src/features/dashboard/components/QuickActionsPanel.tsx

import React from "react";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuickActionsPanelProps } from "../../../types/dashboard.types";
import { cn } from "@/lib/utils";

/**
 * Quick Actions Panel - Compact zinc-styled design with subscription gating
 */
export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions,
  onActionClick,
  isCreating,
}) => {
  const navigate = useNavigate();

  const handleLockedClick = () => {
    navigate({ to: "/settings", search: { tab: "billing" } });
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
        Quick Actions
      </div>
      <div className="flex flex-col gap-1">
        {actions.map((action, index) => {
          // Check if action is gated (hasAccess defaults to true if not specified)
          const isLocked = action.hasAccess === false;

          if (isLocked) {
            return (
              <TooltipProvider key={index}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleLockedClick}
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-6 text-[10px] font-medium justify-start w-full border-zinc-200 dark:border-zinc-700",
                        "text-zinc-400 dark:text-zinc-500 hover:text-zinc-500 dark:hover:text-zinc-400",
                        "hover:bg-zinc-50 dark:hover:bg-zinc-800",
                      )}
                    >
                      <Lock className="h-2.5 w-2.5 mr-1.5" />
                      {action.label}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs max-w-[200px]">
                    <div className="flex items-start gap-1.5">
                      <Crown className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium">
                          {action.lockedTooltip ||
                            `Upgrade to ${action.requiredTier || "Starter"} to unlock`}
                        </p>
                        <p className="text-zinc-400 dark:text-zinc-500 mt-0.5">
                          Click to view plans
                        </p>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }

          return (
            <Button
              key={index}
              onClick={() => onActionClick(action.action)}
              disabled={isCreating}
              variant="outline"
              size="sm"
              className={cn(
                "h-6 text-[10px] font-medium justify-start w-full border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800",
                isCreating && "opacity-60 cursor-not-allowed",
              )}
            >
              {isCreating && action.label !== "View Reports"
                ? `${action.label}...`
                : action.label}
            </Button>
          );
        })}
      </div>
    </div>
  );
};
