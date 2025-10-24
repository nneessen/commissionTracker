// src/features/dashboard/components/KpiCardDense.tsx
// TODO: remove memo. not needed
import { memo } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface SparklineProps {
  data: number[];
  color?: string;
  className?: string;
}

const Sparkline = memo(
  ({ data, color = "currentColor", className }: SparklineProps) => {
    if (!data || data.length < 2) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const points = data.map((value, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 100 - ((value - min) / range) * 100,
    }));

    const pathData = points
      .map((point, i) => `${i === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    return (
      <svg
        className={cn("w-full h-full", className)}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  },
);

Sparkline.displayName = "Sparkline";

export interface KpiCardProps {
  label: string;
  value: string | number;
  delta?: number;
  deltaLabel?: string;
  sparkData?: number[];
  trend?: "up" | "down" | "neutral";
  color?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

export const KpiCardDense = memo(
  ({
    label,
    value,
    delta,
    deltaLabel = "vs last 7d",
    sparkData,
    trend,
    color = "var(--chart-1)",
    loading = false,
    onClick,
    className,
  }: KpiCardProps) => {
    // Determine trend from delta if not explicitly provided
    const actualTrend =
      trend ||
      (delta !== undefined
        ? delta > 0
          ? "up"
          : delta < 0
            ? "down"
            : "neutral"
        : "neutral");

    const TrendIcon =
      actualTrend === "up"
        ? TrendingUp
        : actualTrend === "down"
          ? TrendingDown
          : Minus;

    const trendColorClass =
      actualTrend === "up"
        ? "text-commission-positive"
        : actualTrend === "down"
          ? "text-commission-negative"
          : "text-commission-neutral";

    if (loading) {
      return (
        <Card
          className={cn(
            "h-28 p-3 rounded-md animate-pulse bg-muted",
            className,
          )}
        >
          <div className="space-y-2">
            <div className="h-5 bg-background/50 rounded w-3/4" />
            <div className="h-3 bg-background/50 rounded w-1/2" />
          </div>
        </Card>
      );
    }

    return (
      <Card
        className={cn(
          "h-28 p-3 rounded-md flex flex-col justify-between transition-all duration-150",
          "hover:shadow-md hover:-translate-y-0.5",
          onClick && "cursor-pointer",
          className,
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div
              className="text-[20px] font-[700] leading-none truncate"
              title={String(value)}
            >
              {value}
            </div>
            <div
              className="text-[13px] text-muted-foreground mt-1 truncate"
              title={label}
            >
              {label}
            </div>
          </div>

          <div className="flex flex-col items-end ml-2">
            {delta !== undefined && (
              <div className={cn("flex items-center gap-1", trendColorClass)}>
                <TrendIcon className="w-3 h-3" />
                <span className="text-sm font-medium">
                  {delta >= 0 ? `+${delta}%` : `${delta}%`}
                </span>
              </div>
            )}
            {deltaLabel && (
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {deltaLabel}
              </div>
            )}
          </div>
        </div>

        {sparkData && sparkData.length > 1 && (
          <div className="w-full h-8 mt-2">
            <Sparkline data={sparkData} color={color} />
          </div>
        )}
      </Card>
    );
  },
);

KpiCardDense.displayName = "KpiCardDense";

