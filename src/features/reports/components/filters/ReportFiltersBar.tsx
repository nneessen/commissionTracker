// src/features/reports/components/filters/ReportFiltersBar.tsx

import React from 'react';
import { Button } from '@/components/ui/button';
import { X, Filter } from 'lucide-react';
import { ReportFilters, FilterOption } from '@/types/reports.types';
import { MultiSelectFilter } from './MultiSelectFilter';

interface ReportFiltersBarProps {
  filters: ReportFilters;
  onFiltersChange: (filters: ReportFilters) => void;
  carriers: FilterOption[];
  products: FilterOption[];
  states: FilterOption[];
  isLoading?: boolean;
}

export function ReportFiltersBar({
  filters,
  onFiltersChange,
  carriers,
  products,
  states,
  isLoading = false,
}: ReportFiltersBarProps) {
  const hasActiveFilters =
    (filters.carrierIds && filters.carrierIds.length > 0) ||
    (filters.productIds && filters.productIds.length > 0) ||
    (filters.states && filters.states.length > 0);

  const handleCarrierChange = (ids: string[]) => {
    onFiltersChange({
      ...filters,
      carrierIds: ids.length > 0 ? ids : undefined,
    });
  };

  const handleProductChange = (ids: string[]) => {
    onFiltersChange({
      ...filters,
      productIds: ids.length > 0 ? ids : undefined,
    });
  };

  const handleStateChange = (ids: string[]) => {
    onFiltersChange({
      ...filters,
      states: ids.length > 0 ? ids : undefined,
    });
  };

  const handleClearAll = () => {
    onFiltersChange({
      startDate: filters.startDate,
      endDate: filters.endDate,
      carrierIds: undefined,
      productIds: undefined,
      states: undefined,
      clientIds: undefined,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Filter className="h-3 w-3" />
        <span>Filters:</span>
      </div>

      <MultiSelectFilter
        label="Carriers"
        options={carriers}
        selectedIds={filters.carrierIds || []}
        onChange={handleCarrierChange}
        placeholder="Search carriers..."
        disabled={isLoading}
      />

      <MultiSelectFilter
        label="Products"
        options={products}
        selectedIds={filters.productIds || []}
        onChange={handleProductChange}
        placeholder="Search products..."
        disabled={isLoading}
      />

      <MultiSelectFilter
        label="States"
        options={states}
        selectedIds={filters.states || []}
        onChange={handleStateChange}
        placeholder="Search states..."
        disabled={isLoading}
      />

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="h-3 w-3 mr-1" />
          Clear All
        </Button>
      )}
    </div>
  );
}
