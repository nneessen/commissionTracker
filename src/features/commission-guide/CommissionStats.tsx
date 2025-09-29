import React from 'react';
import { BarChart3, Building2, Package, Percent, TrendingUp } from 'lucide-react';
import { useCompGuideStatistics } from '../../hooks/compGuide/useCompGuide';

export function CommissionStats() {
  const { data: stats, isLoading, error } = useCompGuideStatistics();

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-sm text-red-600">Failed to load commission statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Records',
      value: stats.totalRecords.toLocaleString(),
      description: 'Commission rates in database',
      icon: BarChart3,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      name: 'Carriers',
      value: stats.uniqueCarriers.toLocaleString(),
      description: 'Insurance carriers',
      icon: Building2,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      name: 'Product Types',
      value: stats.productTypes.toLocaleString(),
      description: 'Different product categories',
      icon: Package,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      name: 'Average Commission',
      value: `${stats.averageCommission.toFixed(1)}%`,
      description: 'Across all products & carriers',
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900">Commission Guide Overview</h3>
        <p className="text-sm text-gray-500">Current FFG commission data summary</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg shadow border border-gray-200 p-6 transition-transform duration-200 hover:scale-105"
            >
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.bgColor} rounded-md p-3`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-baseline">
                    <p className={`text-2xl font-semibold ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {stat.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {stat.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional insights */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Percent className="h-5 w-5 text-blue-600 mr-2" />
            <h4 className="text-sm font-medium text-blue-900">Commission Range</h4>
          </div>
          <p className="text-sm text-blue-700 mt-1">
            Commission rates typically range from 50% to 150% depending on carrier, product, and contract level.
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
            <h4 className="text-sm font-medium text-green-900">Rate Updates</h4>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Commission rates are updated regularly to reflect current carrier offerings and contract terms.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CommissionStats;