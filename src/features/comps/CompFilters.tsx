// src/features/comps/CompFilters.tsx

import React, { useState } from 'react';
import { Search, Filter, X, Building2, Package, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompFilters } from '../../types/comp.types';
import { Database } from '../../types/database.types';
import { ActiveFilterBadges } from './components/ActiveFilterBadges';
import { formatProductType } from '../../lib/format';

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

  const clearAllFilters = () => {
    onFilterChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          {/* Quick filters - always visible */}
          <div className="flex items-center space-x-3">
            <select
              value={filters.carrier_id || ''}
              onChange={(e) => handleFilterChange('carrier_id', e.target.value)}
              className="border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Carriers</option>
              {carrierIds.map((carrierId) => (
                <option key={carrierId} value={carrierId}>
                  {carrierId}
                </option>
              ))}
            </select>

            <select
              value={filters.product_type || ''}
              onChange={(e) => handleFilterChange('product_type', e.target.value as Database["public"]["Enums"]["product_type"])}
              className="border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Products</option>
              {productTypes.map((product) => (
                <option key={product} value={product}>
                  {formatProductType(product)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {/* Advanced filters toggle */}
          <Button
            onClick={() => setIsExpanded(!isExpanded)}
            variant="outline"
            size="sm"
            className={isExpanded ? 'bg-gray-100' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {Object.keys(filters).length}
              </span>
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
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contract Level Filter */}
            <div>
              <label htmlFor="contractLevel" className="block text-sm font-medium text-gray-700 mb-2">
                <BarChart3 className="h-4 w-4 inline mr-1" />
                Contract Level
              </label>
              <input
                id="contractLevel"
                type="number"
                min="80"
                max="145"
                value={filters.contract_level || ''}
                onChange={(e) => handleFilterChange('contract_level', e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="80-145"
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>

            {/* Carrier Filter (Duplicate for advanced section) */}
            <div>
              <label htmlFor="advancedCarrier" className="block text-sm font-medium text-gray-700 mb-2">
                <Building2 className="h-4 w-4 inline mr-1" />
                Carrier
              </label>
              <select
                id="advancedCarrier"
                value={filters.carrier_id || ''}
                onChange={(e) => handleFilterChange('carrier_id', e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Carriers</option>
                {carrierIds.map((carrierId) => (
                  <option key={carrierId} value={carrierId}>
                    {carrierId}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type Filter (Duplicate for advanced section) */}
            <div>
              <label htmlFor="advancedProduct" className="block text-sm font-medium text-gray-700 mb-2">
                <Package className="h-4 w-4 inline mr-1" />
                Product Type
              </label>
              <select
                id="advancedProduct"
                value={filters.product_type || ''}
                onChange={(e) => handleFilterChange('product_type', e.target.value as Database["public"]["Enums"]["product_type"])}
                className="block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              >
                <option value="">All Products</option>
                {productTypes.map((product) => (
                  <option key={product} value={product}>
                    {formatProductType(product)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          <ActiveFilterBadges
            filters={filters}
            onRemoveFilter={(key) => handleFilterChange(key, undefined)}
          />
        </div>
      )}
    </div>
  );
}

export default CompFiltersComponent;
