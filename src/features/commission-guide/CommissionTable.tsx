import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Building2, Package, Percent, Calendar, AlertCircle } from 'lucide-react';
import { CompGuideQueryResult, CompGuidePaginationOptions } from '../../services/compGuide/compGuideService';

interface CommissionTableProps {
  data?: CompGuideQueryResult;
  pagination: CompGuidePaginationOptions;
  isLoading: boolean;
  error: any;
  onPaginationChange: (newPagination: Partial<CompGuidePaginationOptions>) => void;
}

export function CommissionTable({
  data,
  pagination,
  isLoading,
  error,
  onPaginationChange
}: CommissionTableProps) {

  const handleSort = (field: 'carrier_name' | 'product_type' | 'commission_percentage' | 'contract_level') => {
    const newOrder = pagination.sortBy === field && pagination.sortOrder === 'asc' ? 'desc' : 'asc';
    onPaginationChange({
      sortBy: field,
      sortOrder: newOrder,
      page: 1 // Reset to first page when sorting
    });
  };

  const handlePageChange = (newPage: number) => {
    onPaginationChange({ page: newPage });
  };

  const handlePageSizeChange = (newPageSize: number) => {
    onPaginationChange({
      pageSize: newPageSize,
      page: 1 // Reset to first page when changing page size
    });
  };

  const getSortIcon = (field: string) => {
    if (pagination.sortBy !== field) return null;
    return pagination.sortOrder === 'asc' ?
      <ArrowUp className="h-4 w-4 ml-1" /> :
      <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const formatCommissionRate = (rate: number) => {
    return `${rate.toFixed(2)}%`;
  };

  const getContractLevelBadge = (level: number) => {
    if (level >= 140) return { label: 'Premium', color: 'bg-purple-100 text-purple-800' };
    if (level >= 120) return { label: 'Enhanced', color: 'bg-blue-100 text-blue-800' };
    if (level >= 100) return { label: 'Release', color: 'bg-green-100 text-green-800' };
    return { label: 'Street', color: 'bg-gray-100 text-gray-800' };
  };

  const renderPagination = () => {
    if (!data) return null;

    const { page, totalPages, total, pageSize } = data;
    const startItem = (page - 1) * pageSize + 1;
    const endItem = Math.min(page * pageSize, total);

    return (
      <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
        <div className="flex-1 flex justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
            className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-4">
            <p className="text-sm text-gray-700">
              Showing <span className="font-medium">{startItem}</span> to <span className="font-medium">{endItem}</span> of{' '}
              <span className="font-medium">{total}</span> results
            </p>
            <div className="flex items-center space-x-2">
              <label htmlFor="pageSize" className="text-sm text-gray-700">
                Per page:
              </label>
              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                className="border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
          <div>
            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1}
                className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Previous</span>
                <ChevronLeft className="h-5 w-5" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                      pageNum === page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages}
                className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="sr-only">Next</span>
                <ChevronRight className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Commission Data</h3>
        <p className="text-sm text-gray-500 mb-4">
          {error.message || 'An unexpected error occurred while loading the commission guide.'}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-md">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('carrier_name')}
              >
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2" />
                  Carrier
                  {getSortIcon('carrier_name')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('product_type')}
              >
                <div className="flex items-center">
                  <Package className="h-4 w-4 mr-2" />
                  Product
                  {getSortIcon('product_type')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('contract_level')}
              >
                <div className="flex items-center">
                  Level
                  {getSortIcon('contract_level')}
                </div>
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('commission_percentage')}
              >
                <div className="flex items-center">
                  <Percent className="h-4 w-4 mr-2" />
                  Commission Rate
                  {getSortIcon('commission_percentage')}
                </div>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Effective Date
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-gray-500">Loading commission data...</span>
                  </div>
                </td>
              </tr>
            ) : data?.data.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="text-gray-500">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Commission Data Found</h3>
                    <p className="text-sm">Try adjusting your search filters or check back later.</p>
                  </div>
                </td>
              </tr>
            ) : (
              data?.data.map((record) => {
                const levelBadge = getContractLevelBadge(record.contractLevel);
                return (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{record.carrierName}</div>
                          <div className="text-sm text-gray-500">{record.carrierId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{record.productName}</div>
                        <div className="text-sm text-gray-500">{record.productType}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${levelBadge.color}`}>
                        {levelBadge.label}
                      </span>
                      <div className="text-xs text-gray-500 mt-1">{record.contractLevel}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-semibold text-blue-600">
                        {formatCommissionRate(record.commissionPercentage)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(record.effectiveDate).toLocaleDateString()}
                      {record.expirationDate && (
                        <div className="text-xs text-gray-400">
                          Expires: {new Date(record.expirationDate).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {data && data.data.length > 0 && renderPagination()}
    </div>
  );
}

export default CommissionTable;