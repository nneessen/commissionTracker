// src/features/reports/components/charts/AreaStackedChart.tsx

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../../../lib/format";

export interface AreaStackedChartData {
  label: string;
  [key: string]: string | number;
}

export interface AreaStackedChartProps {
  data: AreaStackedChartData[];
  areas: {
    dataKey: string;
    name: string;
    color: string;
    format?: "currency" | "number" | "percent";
  }[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
  stackOffset?: "none" | "expand" | "wiggle" | "silhouette";
}

/**
 * AreaStackedChart - Stacked area chart for showing cumulative metrics over time
 *
 * @example
 * <AreaStackedChart
 *   data={[
 *     { label: 'Q1', commissioned: 5000, earned: 3000, paid: 2000 },
 *     { label: 'Q2', commissioned: 6000, earned: 4500, paid: 3500 },
 *   ]}
 *   areas={[
 *     { dataKey: 'commissioned', name: 'Commissioned', color: '#3b82f6', format: 'currency' },
 *     { dataKey: 'earned', name: 'Earned', color: '#10b981', format: 'currency' },
 *     { dataKey: 'paid', name: 'Paid', color: '#8b5cf6', format: 'currency' },
 *   ]}
 * />
 */
export function AreaStackedChart({
  data,
  areas,
  height = 300,
  showGrid = true,
  showLegend = true,
  xAxisLabel,
  yAxisLabel,
  stackOffset = "none",
}: AreaStackedChartProps) {
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

  const formatValue = (
    value: number,
    format?: "currency" | "number" | "percent",
  ) => {
    if (typeof value !== "number") return value;

    switch (format) {
      case "currency":
        return formatCurrency(value);
      case "percent":
        return `${value.toFixed(1)}%`;
      case "number":
      default:
        return value.toLocaleString();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- chart data type
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    // Calculate total if stacked
    const total =
      stackOffset === "none"
        ? null
        : payload.reduce(
            (sum: number, entry: any) => sum + (entry.value || 0),
            0,
          );

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- chart data type */}
          {payload.reverse().map((entry: any, index: number) => {
            const area = areas.find((a) => a.dataKey === entry.dataKey);
            const percentage = total
              ? ((entry.value / total) * 100).toFixed(1)
              : null;

            return (
              <div
                key={index}
                className="flex items-center justify-between gap-4 text-xs"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name}:
                </span>
                <span className="font-medium text-foreground">
                  {formatValue(entry.value, area?.format)}
                  {percentage && ` (${percentage}%)`}
                </span>
              </div>
            );
          })}
          {total && (
            <div className="flex items-center justify-between gap-4 text-xs pt-2 border-t border-border mt-2">
              <span className="font-semibold">Total:</span>
              <span className="font-semibold text-foreground">
                {formatValue(total, areas[0]?.format)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart
          data={data}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          stackOffset={stackOffset}
        >
          <defs>
            {areas.map((area, index) => (
              <linearGradient
                key={index}
                id={`gradient-${area.dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={area.color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={area.color} stopOpacity={0.1} />
              </linearGradient>
            ))}
          </defs>
          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              opacity={0.3}
            />
          )}
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            stroke="hsl(var(--border))"
            label={
              xAxisLabel
                ? {
                    value: xAxisLabel,
                    position: "insideBottom",
                    offset: -5,
                    style: { fontSize: 12 },
                  }
                : undefined
            }
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
            stroke="hsl(var(--border))"
            tickFormatter={(value) => {
              if (stackOffset === "expand") {
                return `${(value * 100).toFixed(0)}%`;
              }
              return formatValue(value, areas[0]?.format);
            }}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 12 },
                  }
                : undefined
            }
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
              iconType="rect"
            />
          )}
          {areas.map((area) => (
            <Area
              key={area.dataKey}
              type="monotone"
              dataKey={area.dataKey}
              name={area.name}
              stackId="1"
              stroke={area.color}
              fill={`url(#gradient-${area.dataKey})`}
              fillOpacity={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
