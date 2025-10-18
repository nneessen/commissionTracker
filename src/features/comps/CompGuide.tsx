import React, { useState } from 'react';
import { logger } from '../../services/base/logger';
import { Download, Settings, Calculator, Database } from 'lucide-react';
import { useComps } from '../../hooks/comps';
import { CompFilters } from '../../types/comp.types';
import { UserContractSettings } from './UserContractSettings';
import { CompTable } from './CompTable';
import { CompFiltersComponent } from './CompFilters';
import { CompStats } from './CompStats';

export function CompGuide() {
  const [activeTab, setActiveTab] = useState<'guide' | 'settings'>('guide');
  const [filters, setFilters] = useState<CompFilters>({});

  const { data: comps, isLoading, error } = useComps(filters);

  const handleFilterChange = (newFilters: CompFilters) => {
    setFilters(newFilters);
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    logger.info('Export comp guide data', undefined, 'CompGuide');
  };

  const tabs = [
    {
      id: 'guide',
      name: 'Comp Guide',
      icon: Calculator,
      description: 'FFG compensation rates by carrier and product'
    },
    {
      id: 'settings',
      name: 'Contract Settings',
      icon: Settings,
      description: 'Your contract commission percentage'
    }
  ];

  // Get unique carrier IDs and product types from data for filter options
  const carrierIds = comps ? Array.from(new Set(comps.map(c => c.carrier_id))) : [];
  const productTypes = comps ? Array.from(new Set(comps.map(c => c.product_type))) : [];

  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Comp Guide</h1>
            <p className="page-subtitle">FFG compensation rates and contract settings</p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      <div className="page-content">
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
              <CompStats />

              {/* Filters */}
              <CompFiltersComponent
                filters={filters}
                carrierIds={carrierIds}
                productTypes={productTypes}
                onFilterChange={handleFilterChange}
              />

              {/* Comp Table */}
              <CompTable
                data={comps || []}
                isLoading={isLoading}
                error={error?.message}
              />
            </div>
          ) : (
            <div className="p-6">
              <UserContractSettings />
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default CompGuide;
