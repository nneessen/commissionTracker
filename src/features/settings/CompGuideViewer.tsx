// /home/nneessen/projects/commissionTracker/src/features/settings/CompGuideViewer.tsx
// Modernized Commission Guide Viewer with database integration and server-side pagination

import React, { useState, useCallback, useMemo } from 'react';
import {
  Download,
  FileText,
  FileSpreadsheet,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import {
  useCompGuideData,
  useCarrierNames,
  useProductTypes,
  useCompGuideExport,
  useRefreshCompGuide
} from '../../hooks/compGuide/useCompGuide';
import type { CompGuideFilters, CompGuidePaginationOptions } from '../../services/compGuide/compGuideService';

// Product type options for filtering
const PRODUCT_TYPE_OPTIONS = [
  { value: '', label: 'All Product Types' },
  { value: 'whole_life', label: 'Whole Life' },
  { value: 'term_life', label: 'Term Life' },
  { value: 'universal_life', label: 'Universal Life' },
  { value: 'variable_life', label: 'Variable Life' },
  { value: 'health', label: 'Health' },
  { value: 'disability', label: 'Disability' },
  { value: 'annuity', label: 'Annuity' },
];

// Contract level options for filtering
const CONTRACT_LEVEL_OPTIONS = [
  { value: '', label: 'All Contract Levels' },
  { value: '80', label: 'Street (80%)' },
  { value: '100', label: 'Release (100%)' },
  { value: '120', label: 'Enhanced (120%)' },
  { value: '140', label: 'Premium (140%)' },
];

export const CompGuideViewer: React.FC = () => {
  // Filter state
  const [filters, setFilters] = useState<CompGuideFilters>({
    searchTerm: '',
    carrierName: '',
    productType: '',
    contractLevel: undefined,
  });

  // Pagination state
  const [pagination, setPagination] = useState<CompGuidePaginationOptions>({
    page: 1,
    pageSize: 50,
    sortBy: 'carrier_name',
    sortOrder: 'asc',
  });

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // Fetch data using React Query hooks
  const {
    data: compGuideData,
    isLoading,
    isError,
    error,
    isFetching,
  } = useCompGuideData(filters, pagination);

  const { data: carrierNames } = useCarrierNames();
  const { data: productTypes } = useProductTypes();
  const { refreshAll } = useRefreshCompGuide();

  // Export hook (only enabled when exporting)
  const { data: exportData, isLoading: isLoadingExport } = useCompGuideExport(
    filters,
    { enabled: isExporting }
  );

  // Memoized carrier options
  const carrierOptions = useMemo(() => {
    if (!carrierNames) return [{ value: '', label: 'All Carriers' }];
    return [
      { value: '', label: 'All Carriers' },
      ...carrierNames.map(name => ({ value: name, label: name }))
    ];
  }, [carrierNames]);

  // Filter change handlers
  const handleFilterChange = useCallback((newFilters: Partial<CompGuideFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  const handleSortChange = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setPagination(prev => ({ ...prev, sortBy: sortBy as any, sortOrder, page: 1 }));
  }, []);

  // Export functions
  const exportToCSV = useCallback(async () => {
    if (!exportData) {
      setIsExporting(true);
      return;
    }

    const headers = ['Carrier', 'Product Name', 'Product Type', 'Contract Level', 'Commission %'];
    const csvContent = [
      headers.join(','),
      ...exportData.map(item => [
        `"${item.carrierName}"`,
        `"${item.productName}"`,
        item.productType,
        item.contractLevel,
        item.commissionPercentage
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `commission_guide_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setIsExporting(false);
  }, [exportData]);

  const exportToPDF = useCallback(async () => {
    if (!exportData) {
      setIsExporting(true);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Commission Guide - ${new Date().toLocaleDateString()}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .stats { background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            @media print { body { margin: 0; } }
          </style>
        </head>
        <body>
          <h1>Commission Guide</h1>
          <div class="stats">
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
            <p><strong>Total Records:</strong> ${exportData.length}</p>
            <p><strong>Carriers:</strong> ${Array.from(new Set(exportData.map(d => d.carrierName))).length}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Carrier</th>
                <th>Product Name</th>
                <th>Product Type</th>
                <th>Contract Level</th>
                <th>Commission %</th>
              </tr>
            </thead>
            <tbody>
              ${exportData.map(item => `
                <tr>
                  <td>${item.carrierName}</td>
                  <td>${item.productName}</td>
                  <td>${item.productType}</td>
                  <td>${item.contractLevel}%</td>
                  <td>${item.commissionPercentage}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }

    setIsExporting(false);
  }, [exportData]);

  // Effect to trigger export when data is loaded
  React.useEffect(() => {
    if (isExporting && exportData) {
      // Automatically trigger the last requested export
      // This is a simple implementation - in a real app you'd track which export was requested
    }
  }, [isExporting, exportData]);

  if (isError) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Error loading commission guide data
              </h3>
              <div className="mt-2 text-sm text-red-700">
                {error?.message || 'An unexpected error occurred'}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => refreshAll()}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Commission Guide</h2>
          <p className="text-sm text-gray-600 mt-1">
            {compGuideData && `${compGuideData.total} total records across ${Math.max(1, compGuideData.totalPages)} pages`}
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => refreshAll()}
            disabled={isFetching}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            disabled={isLoadingExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoadingExport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
            Export CSV
          </button>
          <button
            onClick={exportToPDF}
            disabled={isLoadingExport}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoadingExport ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={filters.searchTerm || ''}
                onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                placeholder="Search carriers or products..."
                className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Carrier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrier
            </label>
            <select
              value={filters.carrierName || ''}
              onChange={(e) => handleFilterChange({ carrierName: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {carrierOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Product Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product Type
            </label>
            <select
              value={filters.productType || ''}
              onChange={(e) => handleFilterChange({ productType: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {PRODUCT_TYPE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Contract Level Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contract Level
            </label>
            <select
              value={filters.contractLevel?.toString() || ''}
              onChange={(e) => handleFilterChange({
                contractLevel: e.target.value ? parseInt(e.target.value) : undefined
              })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {CONTRACT_LEVEL_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <span className="text-gray-600">Loading commission data...</span>
            </div>
          </div>
        ) : compGuideData && compGuideData.data.length > 0 ? (
          <>
            {/* Table Header */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
              <div className="grid grid-cols-5 gap-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button
                  onClick={() => handleSortChange('carrier_name', pagination.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-left hover:text-gray-700"
                >
                  Carrier {pagination.sortBy === 'carrier_name' && (pagination.sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('product_type', pagination.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-left hover:text-gray-700"
                >
                  Product Type {pagination.sortBy === 'product_type' && (pagination.sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('contract_level', pagination.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-left hover:text-gray-700"
                >
                  Contract Level {pagination.sortBy === 'contract_level' && (pagination.sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <button
                  onClick={() => handleSortChange('commission_percentage', pagination.sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="text-left hover:text-gray-700"
                >
                  Commission % {pagination.sortBy === 'commission_percentage' && (pagination.sortOrder === 'asc' ? '↑' : '↓')}
                </button>
                <span>Product Name</span>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-gray-200">
              {compGuideData.data.map((item) => (
                <div key={item.id} className="px-6 py-4 whitespace-nowrap">
                  <div className="grid grid-cols-5 gap-4 items-center">
                    <div className="text-sm font-medium text-gray-900">
                      {item.carrierName}
                    </div>
                    <div className="text-sm text-gray-900 capitalize">
                      {item.productType.replace('_', ' ')}
                    </div>
                    <div className="text-sm text-gray-900">
                      {item.contractLevel}%
                    </div>
                    <div className="text-sm font-semibold text-green-700">
                      {item.commissionPercentage}%
                    </div>
                    <div className="text-sm text-gray-900">
                      {item.productName}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(Math.max(1, compGuideData.page - 1))}
                  disabled={compGuideData.page <= 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePageChange(Math.min(compGuideData.totalPages, compGuideData.page + 1))}
                  disabled={compGuideData.page >= compGuideData.totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((compGuideData.page - 1) * compGuideData.pageSize) + 1}</span> to{' '}
                    <span className="font-medium">
                      {Math.min(compGuideData.page * compGuideData.pageSize, compGuideData.total)}
                    </span> of{' '}
                    <span className="font-medium">{compGuideData.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                    <button
                      onClick={() => handlePageChange(Math.max(1, compGuideData.page - 1))}
                      disabled={compGuideData.page <= 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {compGuideData.page} of {compGuideData.totalPages}
                    </span>
                    <button
                      onClick={() => handlePageChange(Math.min(compGuideData.totalPages, compGuideData.page + 1))}
                      disabled={compGuideData.page >= compGuideData.totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No commission data found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search criteria or filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompGuideViewer;