// src/features/analytics/components/shared/AnalyticsTable.tsx

import React from 'react';
import { cn } from '@/lib/utils';

interface Column {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  render?: (value: any, row: any) => React.ReactNode;
}

interface AnalyticsTableProps {
  columns: Column[];
  data: any[];
  className?: string;
  emptyMessage?: string;
}

/**
 * Reusable table component for analytics with consistent styling
 * - Ultra-compact padding (p-1)
 * - Small font size (text-[10px])
 * - Subtle borders (border-border/50)
 * - Consistent header background (bg-muted/30)
 */
export function AnalyticsTable({
  columns,
  data,
  className,
  emptyMessage = "No data available"
}: AnalyticsTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center text-[10px] text-muted-foreground/70 py-2">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn("border border-border/50 rounded overflow-hidden", className)}>
      <table className="w-full text-[10px]">
        <thead className="bg-muted/30">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  "p-1 font-medium",
                  column.align === 'right' ? 'text-right' :
                  column.align === 'center' ? 'text-center' :
                  'text-left',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="border-t border-border/30">
              {columns.map((column) => {
                const value = row[column.key];
                const content = column.render ? column.render(value, row) : value;

                return (
                  <td
                    key={column.key}
                    className={cn(
                      "p-1",
                      column.align === 'right' ? 'text-right' :
                      column.align === 'center' ? 'text-center' :
                      'text-left',
                      column.className
                    )}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}