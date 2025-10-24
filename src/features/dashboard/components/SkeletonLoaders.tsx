// src/features/dashboard/components/SkeletonLoaders.tsx
import React, { memo } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// KPI card skeleton matching exact dimensions
export const KpiSkeleton = memo(({ className }: { className?: string }) => (
  <Card className={cn("h-28 p-3 rounded-md animate-pulse", className)}>
    <div className="flex flex-col justify-between h-full">
      <div className="space-y-2">
        <div className="h-5 bg-muted rounded w-20" />
        <div className="h-3 bg-muted rounded w-32" />
      </div>
      <div className="h-8 bg-muted rounded" />
    </div>
  </Card>
));

KpiSkeleton.displayName = "KpiSkeleton";

// Chart skeleton with fixed height
export const ChartSkeleton = memo(({
  height = "h-56",
  className
}: {
  height?: string;
  className?: string;
}) => (
  <Card className={cn(height, "p-4 animate-pulse", className)}>
    <div className="flex justify-between items-center mb-3">
      <div className="h-4 bg-muted rounded w-32" />
      <div className="flex gap-2">
        <div className="h-7 bg-muted rounded w-20" />
        <div className="h-7 bg-muted rounded w-20" />
      </div>
    </div>
    <div className="h-full bg-muted rounded" />
  </Card>
));

ChartSkeleton.displayName = "ChartSkeleton";

// Table skeleton with rows
export const TableSkeleton = memo(({
  rows = 5,
  columns = 4,
  className
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) => (
  <Card className={cn("p-4 animate-pulse", className)}>
    <div className="flex justify-between items-center mb-3">
      <div className="h-4 bg-muted rounded w-32" />
      <div className="flex gap-2">
        <div className="h-7 bg-muted rounded w-32" />
        <div className="h-7 bg-muted rounded w-7" />
      </div>
    </div>
    <div className="border rounded-md p-3">
      {/* Header */}
      <div className="flex gap-3 pb-2 border-b">
        {[...Array(columns)].map((_, i) => (
          <div key={i} className="h-3 bg-muted rounded flex-1" />
        ))}
      </div>
      {/* Rows */}
      <div className="space-y-2 mt-2">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-3">
            {[...Array(columns)].map((_, j) => (
              <div key={j} className="h-3 bg-muted rounded flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  </Card>
));

TableSkeleton.displayName = "TableSkeleton";

// Grid skeleton for KPI sections
export const GridSkeleton = memo(({
  items = 6,
  columns = "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
  className
}: {
  items?: number;
  columns?: string;
  className?: string;
}) => (
  <div className={cn("grid gap-3", columns, className)}>
    {[...Array(items)].map((_, i) => (
      <KpiSkeleton key={i} />
    ))}
  </div>
));

GridSkeleton.displayName = "GridSkeleton";

// Dashboard skeleton - full page loader
export const DashboardSkeleton = memo(() => (
  <div className="page-layout-dense animate-pulse">
    {/* Header */}
    <div className="flex justify-between items-center mb-4">
      <div>
        <div className="h-5 bg-muted rounded w-32 mb-2" />
        <div className="h-3 bg-muted rounded w-48" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="h-8 bg-muted rounded w-20" />
      </div>
    </div>

    {/* Primary KPI grid */}
    <GridSkeleton items={6} className="mb-3" />

    {/* Secondary row - charts */}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 mb-3">
      <ChartSkeleton className="col-span-1 xl:col-span-2" />
      <ChartSkeleton />
    </div>

    {/* Bottom row - tables */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <TableSkeleton className="h-[420px]" />
      <TableSkeleton className="h-[420px]" rows={3} />
    </div>
  </div>
));

DashboardSkeleton.displayName = "DashboardSkeleton";