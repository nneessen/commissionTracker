// src/features/comps/CompFilters.tsx

import React, { useState } from 'react';
import {Filter, X, Building2, Package, BarChart3} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Card, CardContent} from '@/components/ui/card';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';
import {Badge} from '@/components/ui/badge';
import {CompFilters} from '../../types/commission.types';
import {Database} from '../../types/database.types';
import {ActiveFilterBadges} from './components/ActiveFilterBadges';
import {formatProductType} from '../../lib/format';

interface CompFiltersProps {
  filters: CompFilters;
  carrierIds: string[];
  productTypes: Database["public"]["Enums"]["product_type"][];
  onFilterChange: (filters: CompFilters) => void;
}

export function CompFiltersComponent({
  filters,
  carrierIds,
  productTypes,
  onFilterChange
}: CompFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof CompFilters, value: string | number | undefined) => {
    const newFilters = { ...filters };

    if (value === '' || value === undefined) {
      delete newFilters[key];
    } else {
      newFilters[key] = value as never;
    }

    onFilterChange(newFilters);
  };

  const handleSelectChange = (key: keyof CompFilters, value: string) => {
    handleFilterChange(key, value);
  };

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            {/* Quick filters - always visible */}
            <div className="flex items-center space-x-3">
              <Select
                value={filters.carrier_id || 'all'}
                onValueChange={(value) => handleSelectChange('carrier_id', value === 'all' ? '' : value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Carriers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Carriers</SelectItem>
                  {carrierIds.map((carrierId) => (
                    <SelectItem key={carrierId} value={carrierId}>
                      {carrierId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.product_type || 'all'}
                onValueChange={(value) => handleSelectChange('product_type', value === 'all' ? '' : value as Database["public"]["Enums"]["product_type"])}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {productTypes.map((product) => (
                    <SelectItem key={product} value={product}>
                      {formatProductType(product)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            {/* Advanced filters toggle */}
            <Button
              onClick={() => setIsExpanded(!isExpanded)}
              variant="outline"
              size="sm"
              className={isExpanded ? 'bg-muted' : ''}
            >
              <Filter className="h-4 w-4 mr-2" />
              Advanced
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {Object.keys(filters).length}
                </Badge>
              )}
            </Button>

            {/* Clear filters */}
            {hasActiveFilters && (
              <Button
                onClick={clearAllFilters}
                variant="outline"
                size="sm"
              >
                <X className="h-4 w-4 mr-2" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Contract Level Filter */}
              <div className="space-y-2">
                <Label htmlFor="contractLevel" className="flex items-center">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  Contract Level
                </Label>
                <Input
                  id="contractLevel"
                  type="number"
                  min={80}
                  max={145}
                  value={filters.contract_level || ''}
                  onChange={(e) => handleFilterChange('contract_level', e.target.value ? parseInt(e.target.value) : undefined)}
                  placeholder="80-145"
                />
              </div>

              {/* Carrier Filter (Duplicate for advanced section) */}
              <div className="space-y-2">
                <Label htmlFor="advancedCarrier" className="flex items-center">
                  <Building2 className="h-4 w-4 mr-1" />
                  Carrier
                </Label>
                <Select
                  value={filters.carrier_id || 'all'}
                  onValueChange={(value) => handleSelectChange('carrier_id', value === 'all' ? '' : value)}
                >
                  <SelectTrigger id="advancedCarrier">
                    <SelectValue placeholder="All Carriers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Carriers</SelectItem>
                    {carrierIds.map((carrierId) => (
                      <SelectItem key={carrierId} value={carrierId}>
                        {carrierId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Product Type Filter (Duplicate for advanced section) */}
              <div className="space-y-2">
                <Label htmlFor="advancedProduct" className="flex items-center">
                  <Package className="h-4 w-4 mr-1" />
                  Product Type
                </Label>
                <Select
                  value={filters.product_type || 'all'}
                  onValueChange={(value) => handleSelectChange('product_type', value === 'all' ? '' : value as Database["public"]["Enums"]["product_type"])}
                >
                  <SelectTrigger id="advancedProduct">
                    <SelectValue placeholder="All Products" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Products</SelectItem>
                    {productTypes.map((product) => (
                      <SelectItem key={product} value={product}>
                        {formatProductType(product)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Filters Display */}
            <ActiveFilterBadges
              filters={filters}
              onRemoveFilter={(key) => handleFilterChange(key, undefined)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CompFiltersComponent;
