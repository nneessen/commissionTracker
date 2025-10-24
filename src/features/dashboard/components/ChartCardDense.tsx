// src/features/dashboard/components/ChartCardDense.tsx
import React, { memo, useRef, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { MoreVertical, Maximize2, Download, Filter } from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartCardDenseProps {
  title: string;
  data: any[];
  height?: "sm" | "md" | "lg";
  type?: "line" | "area" | "bar";
  dataKeys?: string[];
  colors?: string[];
  tabs?: { value: string; label: string }[];
  defaultTab?: string;
  onTabChange?: (value: string) => void;
  showLegend?: boolean;
  showGrid?: boolean;
  loading?: boolean;
  className?: string;
}

// Fixed container heights for predictable layout
const heightMap = {
  sm: "h-28", // 112px - sparkline height
  md: "h-44", // 176px - medium chart
  lg: "h-56", // 224px - primary chart
};

// Minimal tooltip for dense layouts
const CustomTooltip = memo(({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-popover border rounded-md p-2 shadow-lg">
      <p className="text-[11px] font-medium mb-1">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-[11px]">
            {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
});

CustomTooltip.displayName = "CustomTooltip";

export const ChartCardDense = memo(({
  title,
  data,
  height = "lg",
  type = "line",
  dataKeys = ["value"],
  colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"],
  tabs,
  defaultTab,
  onTabChange,
  showLegend = false,
  showGrid = true,
  loading = false,
  className,
}: ChartCardDenseProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Use ResizeObserver for responsive charts
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  if (loading) {
    return (
      <Card className={cn(heightMap[height], "p-4 animate-pulse", className)}>
        <div className="h-4 bg-muted rounded w-1/3 mb-3" />
        <div className="h-full bg-muted rounded" />
      </Card>
    );
  }

  const renderChart = () => {
    const chartProps = {
      data,
      margin: { top: 0, right: 0, left: 0, bottom: 0 },
    };

    const axisProps = {
      stroke: "var(--muted-foreground)",
      strokeWidth: 0.5,
      tick: { fill: "var(--muted-foreground)", fontSize: 10 },
    };

    const gridProps = showGrid
      ? {
          strokeDasharray: "3 3",
          stroke: "var(--border)",
          strokeOpacity: 0.3,
        }
      : { stroke: "transparent" };

    switch (type) {
      case "area":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart {...chartProps}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<CustomTooltip />} />
              {dataKeys.map((key, index) => (
                <Area
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  fill={colors[index % colors.length]}
                  fillOpacity={0.2}
                  strokeWidth={1.5}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart {...chartProps}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<CustomTooltip />} />
              {dataKeys.map((key, index) => (
                <Bar
                  key={key}
                  dataKey={key}
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      default: // line
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart {...chartProps}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="name" {...axisProps} />
              <YAxis {...axisProps} />
              <Tooltip content={<CustomTooltip />} />
              {dataKeys.map((key, index) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[index % colors.length]}
                  strokeWidth={1.5}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className={cn(heightMap[height], "p-3", className)}>
      {/* Compact header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[16px] font-[600] truncate">{title}</h3>
        <div className="flex items-center gap-1">
          {tabs && (
            <Tabs defaultValue={defaultTab} onValueChange={onTabChange}>
              <TabsList className="h-7">
                {tabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-[11px] px-2 h-6"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem className="text-sm">
                <Maximize2 className="mr-2 h-3 w-3" />
                Expand
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm">
                <Download className="mr-2 h-3 w-3" />
                Export
              </DropdownMenuItem>
              <DropdownMenuItem className="text-sm">
                <Filter className="mr-2 h-3 w-3" />
                Filter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Chart container with fixed height */}
      <div
        ref={containerRef}
        className="w-full"
        style={{
          height: height === "sm" ? "64px" : height === "md" ? "128px" : "172px",
        }}
      >
        {renderChart()}
      </div>
    </Card>
  );
});

ChartCardDense.displayName = "ChartCardDense";