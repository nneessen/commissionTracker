// /home/nneessen/projects/commissionTracker/src/features/analytics/MetricsCard.tsx

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

export const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  color = 'blue',
}) => {
  return (
    <div className="metric-card">
      <div className="flex items-center justify-between mb-4">
        <h4>{title}</h4>
        {icon && (
          <div className="p-2 rounded-lg bg-muted border border-border text-foreground">
            {icon}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <div className="metric-value">{value}</div>
          {trend && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {trend.isPositive ? (
                <TrendingUp size={14} />
              ) : (
                <TrendingDown size={14} />
              )}
              <span>{Math.abs(trend.value).toFixed(1)}%</span>
            </div>
          )}
        </div>
        {subtitle && (
          <div className="metric-label">{subtitle}</div>
        )}
      </div>
    </div>
  );
};
