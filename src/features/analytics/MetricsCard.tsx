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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h4>{title}</h4>
        {icon && (
          <div style={{
            padding: '8px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
            border: '1px solid #e2e8f0',
            color: '#1a1a1a'
          }}>
            {icon}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <div className="metric-value">{value}</div>
          {trend && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              color: trend.isPositive ? '#2d3748' : '#1a1a1a'
            }}>
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