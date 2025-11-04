// src/features/reports/components/charts/PieBreakdownChart.tsx

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '../../../../lib/format';

export interface PieBreakdownChartData {
  name: string;
  value: number;
  color?: string;
}

export interface PieBreakdownChartProps {
  data: PieBreakdownChartData[];
  height?: number;
  showLegend?: boolean;
  format?: 'currency' | 'number' | 'percent';
  innerRadius?: number; // For donut chart
  title?: string;
}

const DEFAULT_COLORS = [
  '#10b981', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

/**
 * PieBreakdownChart - Pie/Donut chart for showing category distributions
 *
 * @example
 * <PieBreakdownChart
 *   data={[
 *     { name: 'Life Insurance', value: 50000 },
 *     { name: 'Health Insurance', value: 30000 },
 *     { name: 'Annuities', value: 20000 },
 *   ]}
 *   format="currency"
 *   innerRadius={60}
 * />
 */
export function PieBreakdownChart({
  data,
  height = 300,
  showLegend = true,
  format = 'number',
  innerRadius = 0,
  title,
}: PieBreakdownChartProps) {
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

  // Assign colors if not provided
  const chartData = data.map((item, index) => ({
    ...item,
    color: item.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));

  const formatValue = (value: number) => {
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

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const percentage = ((data.value / total) * 100).toFixed(1);

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3">
        <p className="text-xs font-semibold text-foreground mb-1">{data.name}</p>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Value: <span className="font-medium text-foreground">{formatValue(data.value)}</span></div>
          <div>Share: <span className="font-medium text-foreground">{percentage}%</span></div>
        </div>
      </div>
    );
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for tiny slices

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="600"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="w-full">
      {title && (
        <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={height * 0.35}
            innerRadius={innerRadius}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: '12px' }}
              iconType="circle"
              formatter={(value, entry: any) => {
                const item = chartData.find(d => d.name === value);
                const percentage = item ? ((item.value / total) * 100).toFixed(1) : '0';
                return `${value} (${percentage}%)`;
              }}
            />
          )}
        </PieChart>
      </ResponsiveContainer>

      {/* Center label for donut chart */}
      {innerRadius > 0 && (
        <div className="text-center -mt-[150px] mb-[150px] pointer-events-none">
          <div className="text-2xl font-bold text-foreground">
            {formatValue(total)}
          </div>
          <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">
            Total
          </div>
        </div>
      )}
    </div>
  );
}
