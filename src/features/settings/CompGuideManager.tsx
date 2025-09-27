// src/features/settings/CompGuideManager.tsx

import React, { useState } from 'react';
import { compGuideService } from '../../services';
import { CompGuideEntry } from '../../types/user.types';

export const CompGuideManager: React.FC = () => {
  const [compGuideData, setCompGuideData] = useState<CompGuideEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCarrier, setSelectedCarrier] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  React.useEffect(() => {
    loadCompGuideData();
  }, []);

  const loadCompGuideData = async () => {
    try {
      const data = await compGuideService.getAll();
      setCompGuideData(data);
    } catch (error) {
      console.error('Failed to load comp guide data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredData = React.useMemo(() => {
    return compGuideData.filter(entry => {
      const matchesCarrier = selectedCarrier === 'all' || entry.carrierName === selectedCarrier;
      const matchesProduct = selectedProduct === 'all' || entry.productName === selectedProduct;
      const matchesSearch = searchTerm === '' ||
        entry.carrierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.productName.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesCarrier && matchesProduct && matchesSearch;
    });
  }, [compGuideData, selectedCarrier, selectedProduct, searchTerm]);

  const uniqueCarriers = React.useMemo(() => {
    return Array.from(new Set(compGuideData.map(entry => entry.carrierName))).sort();
  }, [compGuideData]);

  const uniqueProducts = React.useMemo(() => {
    return Array.from(new Set(compGuideData.map(entry => entry.productName))).sort();
  }, [compGuideData]);

  const groupedData = React.useMemo(() => {
    const grouped: Record<string, Record<string, Record<number, number>>> = {};

    filteredData.forEach(entry => {
      if (!grouped[entry.carrierName]) {
        grouped[entry.carrierName] = {};
      }
      if (!grouped[entry.carrierName][entry.productName]) {
        grouped[entry.carrierName][entry.productName] = {};
      }
      grouped[entry.carrierName][entry.productName][entry.contractLevel] = entry.commissionPercentage;
    });

    return grouped;
  }, [filteredData]);

  const refreshData = async () => {
    setLoading(true);
    await loadCompGuideData();
  };

  if (loading) {
    return <div>Loading comp guide data...</div>;
  }

  return (
    <div className="comp-guide-manager">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Comp Guide Management</h3>
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Refresh Data
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              placeholder="Search carriers or products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Carrier
            </label>
            <select
              value={selectedCarrier}
              onChange={(e) => setSelectedCarrier(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Carriers</option>
              {uniqueCarriers.map(carrier => (
                <option key={carrier} value={carrier}>{carrier}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Products</option>
              {uniqueProducts.map(product => (
                <option key={product} value={product}>{product}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">{filteredData.length}</div>
          <div className="text-sm text-gray-500">Total Entries</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">{uniqueCarriers.length}</div>
          <div className="text-sm text-gray-500">Carriers</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">{uniqueProducts.length}</div>
          <div className="text-sm text-gray-500">Products</div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Carrier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  80%
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  90%
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  100%
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  110%
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  120%
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  130%
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  140%
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  145%
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(groupedData).map(([carrier, products]) =>
                Object.entries(products).map(([product, levels]) => (
                  <tr key={`${carrier}-${product}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {carrier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product}
                    </td>
                    {[80, 90, 100, 110, 120, 130, 140, 145].map(level => (
                      <td key={level} className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        {levels[level] ? `${levels[level].toFixed(1)}%` : '-'}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {Object.keys(groupedData).length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No comp guide entries found matching the current filters.
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 text-sm text-gray-600">
        <p><strong>Note:</strong> Commission percentages are shown for each contract compensation level (80% - 145%).
        This data is automatically imported from the comp guide PDF and used for automated commission calculations.</p>
      </div>
    </div>
  );
};