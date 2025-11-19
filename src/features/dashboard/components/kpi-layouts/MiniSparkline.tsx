// src/features/dashboard/components/kpi-layouts/MiniSparkline.tsx

import React from 'react';

interface MiniSparklineProps {
  /**
   * Array of data points to visualize
   */
  data: number[];
  /**
   * Width of the sparkline in pixels
   * @default 60
   */
  width?: number;
  /**
   * Height of the sparkline in pixels
   * @default 20
   */
  height?: number;
  /**
   * Stroke color
   * @default 'currentColor'
   */
  color?: string;
  /**
   * Stroke width
   * @default 1.5
   */
  strokeWidth?: number;
  /**
   * Additional className for the SVG
   */
  className?: string;
}

/**
 * Mini Sparkline Component
 *
 * Renders a simple line chart visualization using pure SVG.
 * Used in the Heatmap KPI layout to show trends.
 *
 * @param props - Component props
 * @returns SVG sparkline visualization
 */
export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  width = 60,
  height = 20,
  color = 'currentColor',
  strokeWidth = 1.5,
  className = '',
}) => {
  if (!data || data.length === 0) {
    return null;
  }

  // Calculate min/max for scaling
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero

  // Generate path points
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  // Create SVG path string
  const pathD = `M ${points.join(' L ')}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};
