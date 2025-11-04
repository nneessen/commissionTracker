// src/features/reports/components/charts/BarComparisonChart.tsx

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../../../lib/format';

export interface BarComparisonChartData {
  label: string;
  [key: string]: string | number;
}

export interface BarComparisonChartProps {
  data: BarComparisonChartData[];
  bars: {
    dataKey: string;
    name: string;
    color: string;
    format?: 'currency' | 'number' | 'percent';
  }[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  layout?: 'vertical' | 'horizontal';
}

/**
 * BarComparisonChart - Bar chart for comparing metrics across categories
 *
 * @example
 * <BarComparisonChart
 *   data={[
 *     { label: 'Q1', current: 5000, previous: 4500 },
 *     { label: 'Q2', current: 6000, previous: 5200 },
 *   ]}
 *   bars={[
 *     { dataKey: 'current', name: 'Current Year', color: '#10b981', format: 'currency' },
 *     { dataKey: 'previous', name: 'Previous Year', color: '#6b7280', format: 'currency' },
 *   ]}
 * />
 */
export function BarComparisonChart({
  data,
  bars,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
  layout = 'horizontal',
}: BarComparisonChartProps) {
  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/10"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const formatValue = (value: number, format?: 'currency' | 'number' | 'percent') => {
    if (typeof value !== 'number') return value;

    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'number':
      default:
        return value.toLocaleString();
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          const bar = bars.find(b => b.dataKey === entry.dataKey);
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-medium text-foreground">
                {formatValue(entry.value, bar?.format)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (layout === 'vertical') {
    return (
      <div className="w-full">
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
            )}
            <XAxis
              type="number"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              stroke="hsl(var(--border))"
              tickFormatter={(value) => formatValue(value, bars[0]?.format)}
            />
            <YAxis
              type="category"
              dataKey="label"
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
              stroke="hsl(var(--border))"
              width={90}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && (
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                iconType="rect"
              />
            )}
            {bars.map((bar) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                name={bar.name}
                fill={bar.color}
                radius={[0, 4, 4, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
          )}
          <XAxis
            dataKey="label"
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            stroke="hsl(var(--border))"
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, style: { fontSize: 12 } } : undefined}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            stroke="hsl(var(--border))"
            tickFormatter={(value) => formatValue(value, bars[0]?.format)}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12 } } : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="rect"
            />
          )}
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
