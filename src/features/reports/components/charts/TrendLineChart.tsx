// src/features/reports/components/charts/TrendLineChart.tsx

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '../../../../lib/format';

export interface TrendLineChartData {
  label: string;
  [key: string]: string | number;
}

export interface TrendLineChartProps {
  data: TrendLineChartData[];
  lines: {
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
}

/**
 * TrendLineChart - Multi-line chart for showing trends over time
 *
 * @example
 * <TrendLineChart
 *   data={[
 *     { label: 'Jan', revenue: 5000, expenses: 2000 },
 *     { label: 'Feb', revenue: 6000, expenses: 2500 },
 *   ]}
 *   lines={[
 *     { dataKey: 'revenue', name: 'Revenue', color: '#10b981', format: 'currency' },
 *     { dataKey: 'expenses', name: 'Expenses', color: '#ef4444', format: 'currency' },
 *   ]}
 * />
 */
export function TrendLineChart({
  data,
  lines,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
}: TrendLineChartProps) {
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
          const line = lines.find(l => l.dataKey === entry.dataKey);
          return (
            <div key={index} className="flex items-center justify-between gap-4 text-xs">
              <span className="flex items-center gap-2">
                <span
                  className="w-3 h-0.5 rounded"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-medium text-foreground">
                {formatValue(entry.value, line?.format)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
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
            tickFormatter={(value) => {
              // Use first line's format for Y-axis
              return formatValue(value, lines[0]?.format);
            }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', style: { fontSize: 12 } } : undefined}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              iconType="line"
            />
          )}
          {lines.map((line) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 4, fill: line.color, strokeWidth: 0 }}
              activeDot={{ r: 6, fill: line.color }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
