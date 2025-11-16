// ClientFilters.tsx - Search and filter controls for clients
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ClientFilters as Filters, ClientStatus } from '@/types/client.types';

interface ClientFiltersProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
}

export function ClientFilters({ filters, onFiltersChange }: ClientFiltersProps) {
  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, searchTerm: value });
  };

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value as ClientStatus | 'all',
    });
  };

  const handleFilterToggle = (key: keyof Filters, value: boolean | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({});
  };

  // Count active filters
  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value !== undefined && value !== '' && value !== 'all'
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={filters.searchTerm || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="lead">Lead</SelectItem>
          </SelectContent>
        </Select>

        {/* Quick Filters */}
        <div className="flex gap-2">
          <Button
            variant={filters.hasPolicies === true ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              handleFilterToggle(
                'hasPolicies',
                filters.hasPolicies === true ? undefined : true
              )
            }
          >
            With Policies
          </Button>
          <Button
            variant={filters.hasActivePolicies === true ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              handleFilterToggle(
                'hasActivePolicies',
                filters.hasActivePolicies === true ? undefined : true
              )
            }
          >
            Active Policies
          </Button>
        </div>

        {/* Clear Filters */}
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="gap-1"
          >
            <X className="h-3 w-3" />
            Clear ({activeFilterCount})
          </Button>
        )}
      </div>

      {/* Active Filter Tags */}
      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.searchTerm && (
            <Badge variant="secondary" className="gap-1">
              Search: {filters.searchTerm}
              <button
                onClick={() => handleSearchChange('')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.status && filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {filters.status}
              <button
                onClick={() => handleStatusChange('all')}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.hasPolicies === true && (
            <Badge variant="secondary" className="gap-1">
              With Policies
              <button
                onClick={() => handleFilterToggle('hasPolicies', undefined)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.hasActivePolicies === true && (
            <Badge variant="secondary" className="gap-1">
              Active Policies
              <button
                onClick={() => handleFilterToggle('hasActivePolicies', undefined)}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}