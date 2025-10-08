// src/features/expenses/components/ExpenseSmartFilters.tsx

import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import type { AdvancedExpenseFilters } from '@/types/expense.types';

interface ExpenseSmartFiltersProps {
  filters: AdvancedExpenseFilters;
  onFiltersChange: (filters: AdvancedExpenseFilters) => void;
  categories: string[];
  resultCount: number;
}

export function ExpenseSmartFilters({
  filters,
  onFiltersChange,
  categories,
  resultCount,
}: ExpenseSmartFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== 'all' && value !== '' && value !== false
  );

  const clearFilters = () => {
    onFiltersChange({
      expenseType: 'all',
      category: 'all',
      searchTerm: '',
      deductibleOnly: false,
      recurringOnly: false,
    });
  };

  const activeFilterCount = [
    filters.expenseType && filters.expenseType !== 'all',
    filters.category && filters.category !== 'all',
    filters.searchTerm,
    filters.startDate,
    filters.endDate,
    filters.minAmount,
    filters.maxAmount,
    filters.deductibleOnly,
    filters.recurringOnly,
  ].filter(Boolean).length;

  return (
    <Card className="relative overflow-hidden border-border/50 backdrop-blur-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-chart-2/5 pointer-events-none" />

      <div className="relative p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search expenses by name, description, or notes..."
              value={filters.searchTerm || ''}
              onChange={(e) => onFiltersChange({ ...filters, searchTerm: e.target.value })}
              className="pl-9 h-11"
            />
          </div>

          {/* Type Filter */}
          <Select
            value={filters.expenseType || 'all'}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, expenseType: value as any })
            }
          >
            <SelectTrigger className="w-full lg:w-[180px] h-11">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Filter */}
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) => onFiltersChange({ ...filters, category: value })}
          >
            <SelectTrigger className="w-full lg:w-[200px] h-11">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filter Badge */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 relative"
              onClick={clearFilters}
            >
              <X className="h-4 w-4" />
              {activeFilterCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {activeFilterCount}
                </Badge>
              )}
            </Button>
          )}
        </div>

        {/* Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Quick filters:</span>

          <Button
            variant={filters.deductibleOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              onFiltersChange({ ...filters, deductibleOnly: !filters.deductibleOnly })
            }
            className="h-8"
          >
            Tax Deductible
          </Button>

          <Button
            variant={filters.recurringOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              onFiltersChange({ ...filters, recurringOnly: !filters.recurringOnly })
            }
            className="h-8"
          >
            Recurring
          </Button>

          <div className="ml-auto text-sm font-medium">
            {resultCount} result{resultCount !== 1 ? 's' : ''}
          </div>
        </div>
      </div>
    </Card>
  );
}
