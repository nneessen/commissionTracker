// src/features/analytics/visualizations/ForecastChart.tsx

import React from 'react';
import { GrowthProjection } from '../../../services/analytics/forecastService';

interface ForecastChartProps {
  data: GrowthProjection[];
  title?: string;
  valueKey?: 'projectedPolicies' | 'projectedRevenue' | 'projectedCommission';
  valueLabel?: string;
}

/**
 * ForecastChart - Line chart with confidence intervals
 *
 * Displays growth projections with visual confidence bands
 */
export function ForecastChart({
  data,
  title = 'Growth Forecast',
  valueKey = 'projectedCommission',
  valueLabel = 'Projected Commission'
}: ForecastChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="p-10 text-center text-gray-400 text-xs">
        No forecast data available
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toFixed(0);
  };

  const values = data.map(d => d[valueKey] || 0).filter(v => !isNaN(v) && isFinite(v));
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const valueRange = Math.max(maxValue - minValue, 1); // Minimum range of 1 to avoid division by zero

  const width = 600;
  const height = 300;
  const padding = { top: 40, right: 60, bottom: 60, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Scale functions with safety checks
  const dataLength = Math.max(data.length - 1, 1); // Prevent division by zero
  const scaleX = (index: number) => (index / dataLength) * chartWidth;
  const scaleY = (value: number) => {
    if (isNaN(value) || !isFinite(value)) return chartHeight / 2;
    return chartHeight - ((value - minValue) / valueRange) * chartHeight;
  };

  // Confidence band margins
  const getConfidenceMargin = (confidence: 'high' | 'medium' | 'low'): number => {
    if (confidence === 'high') return 0.05; // ±5%
    if (confidence === 'medium') return 0.15; // ±15%
    return 0.25; // ±25%
  };

  // Generate path for line
  const linePath = data
    .map((d, i) => {
      const x = scaleX(i);
      const y = scaleY(d[valueKey] || 0);
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return '';
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .filter(Boolean)
    .join(' ');

  // Generate path for confidence band (upper)
  const upperBandPath = data
    .map((d, i) => {
      const margin = getConfidenceMargin(d.confidence);
      const value = (d[valueKey] || 0) * (1 + margin);
      const x = scaleX(i);
      const y = scaleY(value);
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return '';
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .filter(Boolean)
    .join(' ');

  // Generate path for confidence band (lower)
  const lowerBandPathSegments = data
    .map((d, i) => {
      const margin = getConfidenceMargin(d.confidence);
      const value = (d[valueKey] || 0) * (1 - margin);
      const x = scaleX(i);
      const y = scaleY(value);
      if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return null;
      return { x, y, isFirst: i === 0 };
    })
    .filter(Boolean);

  const lowerBandPath = lowerBandPathSegments
    .map((seg, i) => seg.isFirst ? `M ${seg.x} ${seg.y}` : `L ${seg.x} ${seg.y}`)
    .join(' ');

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const value = minValue + (valueRange * i) / 4;
    const y = scaleY(value);
    return { value, y: isNaN(y) || !isFinite(y) ? 0 : y };
  });

  return (
    <div>
      {/* Title */}
      <div className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
        {title}
      </div>

      {/* Chart SVG */}
      <svg width={width} height={height} className="overflow-visible">
        <g transform={`translate(${padding.left}, ${padding.top})`}>
          {/* Grid lines */}
          {yTicks.map((tick, i) => (
            <line
              key={`grid-${i}`}
              x1={0}
              y1={tick.y}
              x2={chartWidth}
              y2={tick.y}
              stroke="#f1f5f9"
              strokeWidth="1"
            />
          ))}

          {/* Confidence band */}
          {upperBandPath && lowerBandPath && lowerBandPathSegments.length > 0 && (
            <path
              d={`${upperBandPath} ${lowerBandPathSegments.reverse().map(seg => `L ${seg.x} ${seg.y}`).join(' ')} Z`}
              fill="#3b82f6"
              opacity={0.1}
            />
          )}

          {/* Upper confidence line */}
          {upperBandPath && (
            <path
              d={upperBandPath}
              stroke="#3b82f6"
              strokeWidth="1"
              strokeDasharray="4,4"
              fill="none"
              opacity={0.4}
            />
          )}

          {/* Lower confidence line */}
          {lowerBandPath && (
            <path
              d={lowerBandPath}
              stroke="#3b82f6"
              strokeWidth="1"
              strokeDasharray="4,4"
              fill="none"
              opacity={0.4}
            />
          )}

          {/* Main forecast line */}
          {linePath && (
            <path
              d={linePath}
              stroke="#3b82f6"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data points */}
          {data.map((d, i) => {
            const x = scaleX(i);
            const y = scaleY(d[valueKey] || 0);
            const color =
              d.confidence === 'high' ? '#10b981' :
              d.confidence === 'medium' ? '#f59e0b' : '#ef4444';

            // Skip if coordinates are invalid
            if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) return null;

            return (
              <g key={i}>
                <circle
                  cx={x}
                  cy={y}
                  r={5}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="2"
                  className="cursor-pointer"
                />
                <title>{`${d.periodLabel}: ${formatCurrency(d[valueKey] || 0)} (${d.confidence} confidence)`}</title>
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={0}
            y1={chartHeight}
            x2={chartWidth}
            y2={chartHeight}
            stroke="#2d3748"
            strokeWidth="2"
          />
          <line
            x1={0}
            y1={0}
            x2={0}
            y2={chartHeight}
            stroke="#2d3748"
            strokeWidth="2"
          />

          {/* Y-axis labels */}
          {yTicks.map((tick, i) => (
            <g key={`y-label-${i}`}>
              <line
                x1={-6}
                y1={tick.y}
                x2={0}
                y2={tick.y}
                stroke="#2d3748"
                strokeWidth="2"
              />
              <text
                x={-10}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="10px"
                fill="#656d76"
              >
                {valueKey === 'projectedPolicies' ? tick.value.toFixed(0) : formatNumber(tick.value)}
              </text>
            </g>
          ))}

          {/* X-axis labels (show every 2 months) */}
          {data.filter((_, i) => i % 2 === 0).map((d, idx) => {
            const i = idx * 2;
            const x = scaleX(i);
            return (
              <g key={`x-label-${i}`}>
                <line
                  x1={x}
                  y1={chartHeight}
                  x2={x}
                  y2={chartHeight + 6}
                  stroke="#2d3748"
                  strokeWidth="2"
                />
                <text
                  x={x}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  fontSize="10px"
                  fill="#656d76"
                >
                  {d.periodLabel.split(' ')[0]}
                </text>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            x={-chartHeight / 2}
            y={-45}
            textAnchor="middle"
            fontSize="11px"
            fontWeight="600"
            fill="#1a1a1a"
            transform={`rotate(-90, ${-chartHeight / 2}, -45)`}
          >
            {valueLabel}
          </text>
        </g>
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
          <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '50%' }} />
          <span>High Confidence</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '50%' }} />
          <span>Medium Confidence</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '50%' }} />
          <span>Low Confidence</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <svg width="20" height="8">
            <rect x="0" y="3" width="20" height="2" fill="#3b82f6" opacity="0.2" />
          </svg>
          <span>Confidence Interval</span>
        </div>
      </div>
    </div>
  );
}
