// src/features/expenses/components/ExpensePageHeader.tsx

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, Plus } from 'lucide-react';
import type { ExpenseFilters } from '../../../types/expense.types';

export interface ExpensePageHeaderProps {
  selectedMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday: () => void;
  onExportCSV: () => void;
  onExportPDF?: () => void;
  onAddExpense: () => void;
}

/**
 * ExpensePageHeader - Top control bar for expense page
 *
 * Includes:
 * - Month navigation controls
 * - Export menu (CSV/PDF)
 * - Add expense button
 *
 * Matches dashboard/analytics header patterns
 */
export function ExpensePageHeader({
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  onToday,
  onExportCSV,
  onExportPDF,
  onAddExpense,
}: ExpensePageHeaderProps) {
  const monthYear = selectedMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      {/* Left: Month Navigation */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-muted/30 p-1 rounded-md shadow-inner">
          <Button
            onClick={onPrevMonth}
            variant="ghost"
            size="sm"
            className="px-3 py-1.5 text-xs font-semibold h-auto rounded-sm"
          >
            ← Prev
          </Button>
          <Button
            onClick={onToday}
            variant="ghost"
            size="sm"
            className="px-4 py-1.5 text-xs font-semibold h-auto rounded-sm"
          >
            Today
          </Button>
          <Button
            onClick={onNextMonth}
            variant="ghost"
            size="sm"
            className="px-3 py-1.5 text-xs font-semibold h-auto rounded-sm"
          >
            Next →
          </Button>
        </div>
        <div className="text-sm font-semibold text-foreground ml-2">
          {monthYear}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Export Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="px-3 py-1.5 text-xs h-auto"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportCSV}>
              Export CSV
            </DropdownMenuItem>
            {onExportPDF && (
              <DropdownMenuItem onClick={onExportPDF}>
                Export PDF
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Expense Button */}
        <Button
          onClick={onAddExpense}
          size="sm"
          className="px-3 py-1.5 text-xs h-auto"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Expense
        </Button>
      </div>
    </div>
  );
}
