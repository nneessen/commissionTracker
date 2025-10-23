// src/features/dashboard/components/QuickActionsPanel.tsx

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickActionsPanelProps } from "../../../types/dashboard.types";
import { cn } from "@/lib/utils";

/**
 * Quick Actions Panel Component
 *
 * Displays quick action buttons (Add Policy, Add Expense, View Reports).
 * Extracted from DashboardHome.tsx (lines 1150-1214).
 *
 * Refactored to use Tailwind CSS classes instead of inline styles.
 */
export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  actions,
  onActionClick,
  isCreating,
}) => {
  return (
    <Card>
      <CardHeader className="p-4 pb-3">
        <CardTitle className="text-sm uppercase tracking-wide">
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex flex-col gap-1.5">
          {actions.map((action, index) => (
            <Button
              key={index}
              onClick={() => onActionClick(action.action)}
              disabled={isCreating}
              variant="outline"
              size="sm"
              className={cn(
                "px-3 py-2 h-auto rounded-md text-xs font-medium justify-start transition-all duration-200 w-full",
                isCreating
                  ? "bg-muted/30 text-muted-foreground cursor-not-allowed opacity-60"
                  : "bg-muted/10 text-foreground hover:bg-muted/20",
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
