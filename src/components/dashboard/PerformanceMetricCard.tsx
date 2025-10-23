// src/components/dashboard/PerformanceMetricCard.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceMetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'yellow';
  onClick?: () => void;
}

export const PerformanceMetricCard: React.FC<PerformanceMetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'blue',
  onClick,
}) => {
  const colorClasses = {
    blue: {
      bg: 'bg-gradient-to-br from-status-earned to-primary',
      light: 'bg-primary/10',
    },
    green: {
      bg: 'bg-gradient-to-br from-status-active to-status-active/80',
      light: 'bg-status-active-bg',
    },
    purple: {
      bg: 'bg-gradient-to-br from-primary to-primary/80',
      light: 'bg-primary/10',
    },
    orange: {
      bg: 'bg-gradient-to-br from-status-lapsed to-status-pending',
      light: 'bg-status-pending-bg',
    },
    red: {
      bg: 'bg-gradient-to-br from-destructive to-destructive/80',
      light: 'bg-destructive/10',
    },
    yellow: {
      bg: 'bg-gradient-to-br from-status-pending to-status-earned',
      light: 'bg-status-pending-bg',
    },
  };

  const scheme = colorClasses[color];

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        onClick && "cursor-pointer hover:-translate-y-1 hover:shadow-lg"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", scheme.bg)}>
            <Icon className="h-5 w-5 text-primary-foreground" />
          </div>
          <h3 className="text-sm font-medium text-muted-foreground">
            {title}
          </h3>
        </div>

        <div className="mt-3">
          <div className="text-3xl font-bold text-foreground mb-1">
            {value}
          </div>
          {subtitle && (
            <div className="text-xs text-muted-foreground">
              {subtitle}
            </div>
          )}
          {trend && (
            <div
              className={cn(
                "inline-block text-xs font-semibold px-2 py-1 rounded-md mt-2",
                trend.isPositive
                  ? "text-status-active bg-status-active-bg"
                  : "text-destructive bg-destructive/10"
              )}
            >
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
