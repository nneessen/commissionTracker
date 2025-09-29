import React, { useState } from 'react';
import { Search, Filter, Download, Settings, Calculator, Building2, Database } from 'lucide-react';
import { useCompGuideData, useCarrierNames, useProductTypes } from '../../hooks/compGuide/useCompGuide';
import { CompGuideFilters, CompGuidePaginationOptions } from '../../services/compGuide/compGuideService';
import { UserContractSettings } from './UserContractSettings';
import { CommissionTable } from './CommissionTable';
import { CommissionFilters } from './CommissionFilters';
import { CommissionStats } from './CommissionStats';

export function CommissionGuide() {
  const [activeTab, setActiveTab] = useState<'guide' | 'settings'>('guide');
  const [filters, setFilters] = useState<CompGuideFilters>({});
  const [pagination, setPagination] = useState<CompGuidePaginationOptions>({
    page: 1,
    pageSize: 50,
    sortBy: 'carrier_name',
    sortOrder: 'asc'
  });

  const { data: compGuideData, isLoading, error } = useCompGuideData(filters, pagination);
  const { data: carrierNames } = useCarrierNames();
  const { data: productTypes } = useProductTypes();

  const handleFilterChange = (newFilters: CompGuideFilters) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePaginationChange = (newPagination: Partial<CompGuidePaginationOptions>) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    console.log('Export commission guide data');
  };

  const tabs = [
    {
      id: 'guide',
      name: 'Commission Guide',
      icon: Calculator,
      description: 'FFG commission rates by carrier and product'
    },
    {
      id: 'settings',
      name: 'Contract Settings',
      icon: Settings,
      description: 'Your contract commission percentage'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Database className="h-6 w-6 text-blue-600 mr-3" />
              <h1 className="text-xl font-semibold text-gray-900">Commission Guide</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleExport}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'guide' | 'settings')}
                  className={`group flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                    isActive
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon
                    className={`mr-2 h-5 w-5 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-500 font-normal">{tab.description}</div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {activeTab === 'guide' ? (
            <div className="p-6">
              {/* Statistics */}
              <CommissionStats />

              {/* Filters */}
              <CommissionFilters
                filters={filters}
                carrierNames={carrierNames || []}
                productTypes={productTypes || []}
                onFilterChange={handleFilterChange}
              />

              {/* Commission Table */}
              <CommissionTable
                data={compGuideData}
                pagination={pagination}
                isLoading={isLoading}
                error={error}
                onPaginationChange={handlePaginationChange}
              />
            </div>
          ) : (
            <div className="p-6">
              <UserContractSettings />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CommissionGuide;