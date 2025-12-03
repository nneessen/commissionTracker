// src/features/analytics/components/shared/AnalyticsHeading.tsx

import React from 'react';
import { cn } from '@/lib/utils';

interface AnalyticsHeadingProps {
  title: string;
  subtitle?: string;
  className?: string;
  children?: React.ReactNode; // For actions/badges on the right
}

/**
 * Reusable heading component for analytics sections with consistent styling
 * - Small font size (text-[11px] for title)
 * - Uppercase title with proper tracking
 * - Optional subtitle with even smaller text
 * - Supports right-aligned actions
 */
export function AnalyticsHeading({
  title,
  subtitle,
  className,
  children
}: AnalyticsHeadingProps) {
  return (
    <div className={cn("flex items-center justify-between mb-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <div className="text-[11px] font-medium text-muted-foreground uppercase">
          {title}
        </div>
        {subtitle && (
          <div className="text-[10px] text-muted-foreground/70">
            {subtitle}
          </div>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-1.5">
          {children}
        </div>
      )}
    </div>
  );
}