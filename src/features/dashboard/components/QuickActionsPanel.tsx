// src/features/dashboard/components/QuickActionsPanel.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { QuickActionsPanelProps } from "../../../types/dashboard.types";
import { cn } from "@/lib/utils";

/**
 * Quick Actions Panel - Compact zinc-styled design
 */
export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions,
  onActionClick,
  isCreating,
}) => {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
      <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
        Quick Actions
      </div>
      <div className="flex flex-col gap-1">
        {actions.map((action, index) => (
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
        ))}
      </div>
    </div>
  );
};
