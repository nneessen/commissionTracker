// src/features/dashboard/components/QuickActionsPanel.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { QuickActionsPanelProps } from '../../../types/dashboard.types';
import { cn } from '@/lib/utils';

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
    <div className="bg-card rounded-lg p-3.5 shadow-sm">
      <div className="text-sm font-semibold mb-2.5 text-foreground uppercase tracking-wide">
        Quick Actions
      </div>
      <div className="flex flex-col gap-1.5">
        {actions.map((action, index) => (
          <Button
            key={index}
            onClick={() => onActionClick(action.action)}
            disabled={isCreating}
            variant="outline"
            size="sm"
            className={cn(
              "px-3 py-2 h-auto rounded-sm text-xs font-medium justify-start transition-all duration-200",
              isCreating
                ? "bg-muted/30 border-border/50 text-muted-foreground cursor-not-allowed opacity-60"
                : "bg-card border-border text-foreground hover:bg-muted/20 hover:border-border/80"
            )}
          >
            {isCreating && action.label !== 'View Reports'
              ? `${action.label}...`
              : action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
