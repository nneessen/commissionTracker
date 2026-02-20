// src/features/contracting/components/ContractingFilters.tsx
// Filter panel for contracting hub with status, date range, and carrier filters

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Filter, X } from 'lucide-react';

export interface ContractingFilterState {
  status: string[];
  startDate: string | null;
  endDate: string | null;
  carrierId: string | null;
}

interface ContractingFiltersProps {
  filters: ContractingFilterState;
  onFiltersChange: (filters: ContractingFilterState) => void;
  carriers: Array<{ id: string; name: string }>;
}

const STATUS_OPTIONS = [
  { value: 'requested', label: 'Requested' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'writing_received', label: 'Writing Received' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

export function ContractingFilters({ filters, onFiltersChange, carriers }: ContractingFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    filters.status.length > 0 ||
    filters.startDate ||
    filters.endDate ||
    filters.carrierId;

  const clearFilters = () => {
    onFiltersChange({
      status: [],
      startDate: null,
      endDate: null,
      carrierId: null,
    });
  };

  const activeFilterCount =
    filters.status.length +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0) +
    (filters.carrierId ? 1 : 0);

  return (
    <div className="space-y-2">
      {/* Filter Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-1 h-7 text-xs"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 h-4 px-1.5 rounded-full bg-foreground text-background text-[9px] font-medium">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1 text-muted-foreground h-7 text-xs"
          >
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg border border-border">
          {/* Status Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Status</Label>
            <div className="space-y-1">
              {STATUS_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${option.value}`}
                    checked={filters.status.includes(option.value)}
                    onCheckedChange={(checked) => {
                      const newStatus = checked
                        ? [...filters.status, option.value]
                        : filters.status.filter((s) => s !== option.value);
                      onFiltersChange({ ...filters, status: newStatus });
                    }}
                  />
                  <Label
                    htmlFor={`status-${option.value}`}
                    className="text-xs font-normal cursor-pointer"
                  >
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Start Date</Label>
            <Input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, startDate: e.target.value || null })
              }
              className="h-8 text-xs"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">End Date</Label>
            <Input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) =>
                onFiltersChange({ ...filters, endDate: e.target.value || null })
              }
              className="h-8 text-xs"
            />
          </div>

          {/* Carrier Filter */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Carrier</Label>
            <Select
              value={filters.carrierId || 'all'}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, carrierId: value === 'all' ? null : value })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="All carriers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All carriers</SelectItem>
                {carriers.map((carrier) => (
                  <SelectItem key={carrier.id} value={carrier.id}>
                    {carrier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );
}
