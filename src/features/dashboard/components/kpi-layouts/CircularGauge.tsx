// src/features/dashboard/components/kpi-layouts/CircularGauge.tsx

import React from 'react';
import { cn } from '@/lib/utils';

interface CircularGaugeProps {
  /**
   * Current value (0-100 representing percentage)
   */
  value: number;
  /**
   * Size of the gauge in pixels
   * @default 60
   */
  size?: number;
  /**
   * Stroke width
   * @default 4
   */
  strokeWidth?: number;
  /**
   * Color for the progress arc
   * @default 'hsl(var(--primary))'
   */
  color?: string;
  /**
   * Color for the background track
   * @default 'hsl(var(--muted))'
   */
  trackColor?: string;
  /**
   * Whether to show the percentage text in the center
   * @default true
   */
  showValue?: boolean;
  /**
   * Additional className for the container
   */
  className?: string;
}

/**
 * Circular Gauge Component
 *
 * Apple Watch-style circular progress indicator.
 * Used in the Matrix KPI layout for percentage-based metrics.
 *
 * @param props - Component props
 * @returns SVG circular gauge visualization
 */
export const CircularGauge: React.FC<CircularGaugeProps> = ({
  value,
  size = 60,
  strokeWidth = 4,
  color = 'hsl(var(--primary))',
  trackColor = 'hsl(var(--muted))',
  showValue = true,
  className = '',
}) => {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));

  // Calculate SVG circle properties
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />

        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Center value */}
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold font-mono">
            {Math.round(clampedValue)}%
          </span>
        </div>
      )}
    </div>
  );
};
