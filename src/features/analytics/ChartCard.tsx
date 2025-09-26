// /home/nneessen/projects/commissionTracker/src/features/analytics/ChartCard.tsx

import React from 'react';
import { TimeSeriesData } from '../../types/metrics.types';

interface ChartCardProps {
  title: string;
  data: TimeSeriesData[];
  type?: 'line' | 'bar';
  valuePrefix?: string;
  valueSuffix?: string;
  height?: number;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  data,
  type = 'line',
  valuePrefix = '',
  valueSuffix = '',
  height = 200,
}) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-400">
          No data available
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const formatMonth = (label: string) => {
    // Label is already formatted as "MMM YYYY" from useMetrics
    return label.split(' ')[0]; // Get just the month part
  };

  const formatValue = (value: number) => {
    if (value >= 1000000) {
      return `${valuePrefix}${(value / 1000000).toFixed(1)}M${valueSuffix}`;
    }
    if (value >= 1000) {
      return `${valuePrefix}${(value / 1000).toFixed(1)}K${valueSuffix}`;
    }
    return `${valuePrefix}${value.toFixed(0)}${valueSuffix}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <h3 className="text-lg font-medium mb-4">{title}</h3>

      {type === 'bar' ? (
        <div className="space-y-2">
          {/* Bar Chart */}
          <div className="flex items-end justify-between gap-2" style={{ height }}>
            {data.map((item, index) => {
              const barHeight = ((item.value - minValue) / range) * 100;
              return (
                <div key={index} className="flex-1 flex flex-col items-center justify-end">
                  <div className="text-xs text-gray-600 mb-1">
                    {formatValue(item.value)}
                  </div>
                  <div
                    className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-colors"
                    style={{ height: `${Math.max(barHeight, 5)}%` }}
                    title={`${formatMonth(item.label)}: ${formatValue(item.value)}`}
                  />
                  <div className="text-xs text-gray-500 mt-2">
                    {formatMonth(item.label)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Line Chart - Simplified SVG */}
          <svg width="100%" height={height} viewBox={`0 0 ${data.length * 60} ${height}`}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
              <line
                key={ratio}
                x1="0"
                y1={height - (ratio * height)}
                x2={data.length * 60}
                y2={height - (ratio * height)}
                stroke="#e5e7eb"
                strokeDasharray="2 2"
              />
            ))}

            {/* Line path */}
            <path
              d={data.map((item, index) => {
                const x = index * 60 + 30;
                const y = height - ((item.value - minValue) / range) * (height - 20) - 10;
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              stroke="#3b82f6"
              strokeWidth="2"
              fill="none"
            />

            {/* Data points */}
            {data.map((item, index) => {
              const x = index * 60 + 30;
              const y = height - ((item.value - minValue) / range) * (height - 20) - 10;
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill="#3b82f6"
                    className="hover:r-6"
                  />
                  <text
                    x={x}
                    y={height - 5}
                    textAnchor="middle"
                    className="text-xs fill-gray-500"
                  >
                    {formatMonth(item.label)}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Y-axis labels */}
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatValue(minValue)}</span>
            <span>{formatValue(maxValue)}</span>
          </div>
        </div>
      )}
    </div>
  );
};