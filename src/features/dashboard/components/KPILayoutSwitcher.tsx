// src/features/dashboard/components/KPILayoutSwitcher.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { KPILayoutSwitcherProps } from '../../../types/dashboard.types';
import { KPILayout } from '../../../types/dashboard.types';
import { cn } from '@/lib/utils';
import { Grid3x3, List, LayoutGrid } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Layout configuration with icons and labels
 */
const LAYOUTS: Array<{
  value: KPILayout;
  icon: typeof Grid3x3;
  label: string;
  description: string;
}> = [
  {
    value: 'heatmap',
    icon: Grid3x3,
    label: 'Heatmap',
    description: 'Color-coded performance grid with sparklines',
  },
  {
    value: 'narrative',
    icon: List,
    label: 'Narrative',
    description: 'Story-driven insights with context',
  },
  {
    value: 'matrix',
    icon: LayoutGrid,
    label: 'Matrix',
    description: 'Command center quadrant view',
  },
];

/**
 * KPI Layout Switcher Component
 *
 * Button group for selecting between different KPI layout variants.
 * Provides visual toggle for Heatmap, Narrative, and Matrix layouts.
 *
 * Similar styling to TimePeriodSwitcher for consistency.
 */
export const KPILayoutSwitcher: React.FC<KPILayoutSwitcherProps> = ({
  layout,
  onLayoutChange,
}) => {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex gap-1 bg-muted/30 p-1 rounded-md shadow-inner">
        {LAYOUTS.map((layoutOption) => {
          const Icon = layoutOption.icon;
          const isActive = layout === layoutOption.value;

          return (
            <Tooltip key={layoutOption.value}>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onLayoutChange(layoutOption.value)}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'px-3 py-2 text-xs font-semibold h-auto rounded-sm transition-all duration-200',
                    isActive
                      ? 'bg-card text-foreground shadow-sm'
                      : 'bg-transparent text-muted-foreground hover:text-foreground'
                  )}
                  aria-label={`Switch to ${layoutOption.label} layout`}
                  aria-pressed={isActive}
                >
                  <Icon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1">
                  <div className="font-semibold">{layoutOption.label} Layout</div>
                  <div className="text-xs text-muted-foreground">
                    {layoutOption.description}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
