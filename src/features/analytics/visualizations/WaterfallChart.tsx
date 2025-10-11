// src/features/analytics/visualizations/WaterfallChart.tsx

import React from 'react';
import { ContributionBreakdown } from '../../../services/analytics/attributionService';

interface WaterfallChartProps {
  data: ContributionBreakdown;
  title?: string;
}

/**
 * WaterfallChart - Shows contribution breakdown
 *
 * Visualizes how volume, rate, and mix effects contribute
 * to overall performance change.
 */
export function WaterfallChart({ data, title = 'Performance Attribution' }: WaterfallChartProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const bars = [
    { label: 'Volume Effect', value: data.volumeEffect || 0, color: '#3b82f6', percent: data.volumePercent || 0 },
    { label: 'Rate Effect', value: data.rateEffect || 0, color: '#10b981', percent: data.ratePercent || 0 },
    { label: 'Mix Effect', value: data.mixEffect || 0, color: '#f59e0b', percent: data.mixPercent || 0 },
  ];

  const maxValue = Math.max(...bars.map(b => Math.abs(b.value)), Math.abs(data.totalChange || 0), 1); // Minimum 1 to avoid division by zero
  const chartHeight = 240;
  const barWidth = 80;
  const gap = 40;

  // Calculate cumulative positions
  let cumulativeValue = 0;
  const positions = bars.map(bar => {
    const start = cumulativeValue;
    cumulativeValue += bar.value;
    return {
      ...bar,
      start,
      end: cumulativeValue,
    };
  });

  return (
    <div>
      {/* Title */}
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </div>

      {/* Chart SVG */}
      <svg
        width="100%"
        height={chartHeight + 60}
        style={{ overflow: 'visible' }}
      >
        {/* Y-axis zero line */}
        <line
          x1="0"
          y1={chartHeight / 2}
          x2="100%"
          y2={chartHeight / 2}
          stroke="#e2e8f0"
          strokeWidth="2"
        />

        {/* Bars */}
        {positions.map((bar, idx) => {
          const x = idx * (barWidth + gap) + 40;
          const yStart = chartHeight / 2 - ((bar.start || 0) / maxValue) * (chartHeight / 2 - 20);
          const yEnd = chartHeight / 2 - ((bar.end || 0) / maxValue) * (chartHeight / 2 - 20);
          const height = Math.abs(yEnd - yStart) || 0;
          const y = Math.min(yStart, yEnd) || 0;
          const isPositive = (bar.value || 0) >= 0;

          return (
            <g key={bar.label}>
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={height}
                fill={bar.color}
                opacity={0.8}
                rx="4"
              />

              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={y - 8}
                textAnchor="middle"
                fontSize="11px"
                fontWeight="600"
                fill={bar.color}
                fontFamily="Monaco, monospace"
              >
                {formatCurrency(bar.value)}
              </text>

              {/* Percentage label */}
              <text
                x={x + barWidth / 2}
                y={y + height + 16}
                textAnchor="middle"
                fontSize="10px"
                fontWeight="500"
                fill="#656d76"
              >
                {bar.percent.toFixed(0)}%
              </text>

              {/* X-axis label */}
              <text
                x={x + barWidth / 2}
                y={chartHeight + 40}
                textAnchor="middle"
                fontSize="11px"
                fontWeight="500"
                fill="#1a1a1a"
              >
                {bar.label}
              </text>

              {/* Connector line to next bar */}
              {idx < positions.length - 1 && (
                <line
                  x1={x + barWidth}
                  y1={yEnd}
                  x2={x + barWidth + gap}
                  y2={yEnd}
                  stroke="#94a3b8"
                  strokeWidth="2"
                  strokeDasharray="4,4"
                />
              )}
            </g>
          );
        })}

        {/* Total change bar */}
        {positions.length > 0 && (
          <g>
            {(() => {
              const x = positions.length * (barWidth + gap) + 40;
              const yStart = chartHeight / 2;
              const yEnd = chartHeight / 2 - ((data.totalChange || 0) / maxValue) * (chartHeight / 2 - 20);
              const height = Math.abs(yEnd - yStart) || 0;
              const y = Math.min(yStart, yEnd) || 0;
              const isPositive = (data.totalChange || 0) >= 0;

              return (
                <>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    fill={isPositive ? '#10b981' : '#ef4444'}
                    opacity={0.9}
                    rx="4"
                  />

                  {/* Value label */}
                  <text
                    x={x + barWidth / 2}
                    y={y - 8}
                    textAnchor="middle"
                    fontSize="12px"
                    fontWeight="700"
                    fill={isPositive ? '#10b981' : '#ef4444'}
                    fontFamily="Monaco, monospace"
                  >
                    {formatCurrency(data.totalChange)}
                  </text>

                  {/* X-axis label */}
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 40}
                    textAnchor="middle"
                    fontSize="11px"
                    fontWeight="600"
                    fill="#1a1a1a"
                  >
                    Total Change
                  </text>
                </>
              );
            })()}
          </g>
        )}
      </svg>

      {/* Legend */}
      <div style={{
        marginTop: '20px',
        display: 'flex',
        gap: '16px',
        fontSize: '11px',
        color: '#656d76',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} />
          <span>Volume Effect: More/fewer policies</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }} />
          <span>Rate Effect: Commission % changes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }} />
          <span>Mix Effect: Product composition shifts</span>
        </div>
      </div>
    </div>
  );
}
