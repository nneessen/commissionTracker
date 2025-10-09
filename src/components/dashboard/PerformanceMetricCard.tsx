// src/components/dashboard/PerformanceMetricCard.tsx

import React from 'react';
import { LucideIcon } from 'lucide-react';

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
  const colorSchemes = {
    blue: {
      bg: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      light: 'rgba(59, 130, 246, 0.1)',
    },
    green: {
      bg: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      light: 'rgba(16, 185, 129, 0.1)',
    },
    purple: {
      bg: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      light: 'rgba(139, 92, 246, 0.1)',
    },
    orange: {
      bg: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      light: 'rgba(245, 158, 11, 0.1)',
    },
    red: {
      bg: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      light: 'rgba(239, 68, 68, 0.1)',
    },
    yellow: {
      bg: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
      light: 'rgba(234, 179, 8, 0.1)',
    },
  };

  const scheme = colorSchemes[color];

  return (
    <div className={`performance-metric-card ${onClick ? 'clickable' : ''}`} onClick={onClick}>
      <div className="card-header">
        <div className="icon-container" style={{ background: scheme.bg }}>
          <Icon size={20} color="white" />
        </div>
        <h3 className="card-title">{title}</h3>
      </div>

      <div className="card-body">
        <div className="metric-value">{value}</div>
        {subtitle && <div className="metric-subtitle">{subtitle}</div>}
        {trend && (
          <div className={`trend ${trend.isPositive ? 'positive' : 'negative'}`}>
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      <style jsx>{`
        .performance-metric-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .performance-metric-card.clickable {
          cursor: pointer;
        }

        .performance-metric-card.clickable:hover {
          transform: translateY(-4px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .icon-container {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-title {
          font-size: 14px;
          font-weight: 500;
          color: #6b7280;
          margin: 0;
        }

        .card-body {
          margin-top: 12px;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 4px;
        }

        .metric-subtitle {
          font-size: 13px;
          color: #9ca3af;
        }

        .trend {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 6px;
          margin-top: 8px;
        }

        .trend.positive {
          color: #059669;
          background: #d1fae5;
        }

        .trend.negative {
          color: #dc2626;
          background: #fee2e2;
        }
      `}</style>
    </div>
  );
};
