import React, { useState } from 'react';
import { Search, Filter, X, Building2, Package, BarChart3 } from 'lucide-react';
import { CompFilters } from '../../types/comp.types';
import { Database } from '../../types/database.types';

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
                  {product.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          {/* Advanced filters toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isExpanded ? 'bg-gray-100' : ''
            }`}
          >
            <Filter className="h-4 w-4 mr-2" />
            Advanced
            {hasActiveFilters && (
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {Object.keys(filters).length}
              </span>
            )}
          </button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <X className="h-4 w-4 mr-2" />
              Clear
            </button>
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
                    {product.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
              <div className="flex flex-wrap gap-2">
                {filters.carrier_id && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Carrier: {filters.carrier_id}
                    <button
                      onClick={() => handleFilterChange('carrier_id', undefined)}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.product_type && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Product: {filters.product_type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    <button
                      onClick={() => handleFilterChange('product_type', undefined)}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.contract_level && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    Contract Level: {filters.contract_level}
                    <button
                      onClick={() => handleFilterChange('contract_level', undefined)}
                      className="ml-1 text-orange-600 hover:text-orange-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CompFiltersComponent;
