// src/features/dashboard/components/QuickActionsPanel.tsx

import React from "react";
import {Button} from "@/components/ui/button";
import {Card, CardContent} from "@/components/ui/card";
import {QuickActionsPanelProps} from "../../../types/dashboard.types";
import {cn} from "@/lib/utils";

/**
 * Quick Actions Panel - Clean, compact design matching Targets/Expenses pages
 */
export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions,
  onActionClick,
  isCreating,
}) => {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Quick Actions</div>
        <div className="flex flex-col gap-1">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={() => onActionClick(action.action)}
              disabled={isCreating}
              variant="outline"
              size="sm"
              className={cn(
                "h-7 text-[11px] font-medium justify-start w-full",
                isCreating && "opacity-60 cursor-not-allowed",
              )}
            >
              {isCreating && action.label !== "View Reports"
                ? `${action.label}...`
                : action.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
