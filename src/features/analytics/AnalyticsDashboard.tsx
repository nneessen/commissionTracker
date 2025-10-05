// /home/nneessen/projects/commissionTracker/src/features/analytics/AnalyticsDashboard.tsx

import React, { useState } from 'react';
import '../../styles/policy.css';
import {
  Users,
  FileText,
  DollarSign,
  TrendingUp,
  Target,
  MapPin,
  Package,
  Building,
  AlertCircle
} from 'lucide-react';
import { useMetrics } from '../../hooks/useMetrics';
import { MetricsCard } from './MetricsCard';
import { ChartCard } from './ChartCard';
import { PerformanceTable } from './PerformanceTable';
import { Select } from '../../components/ui';
import { SelectOption } from '../../types/ui.types';

export const AnalyticsDashboard: React.FC = () => {
  const {
    clientMetrics,
    policyMetrics,
    commissionMetrics,
    productPerformance,
    carrierPerformance,
    statePerformance,
    forecastMetrics,
  } = useMetrics();

  const [view, setView] = useState<'overview' | 'clients' | 'policies' | 'commissions' | 'forecasts'>('overview');

  const viewOptions: SelectOption[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'clients', label: 'Client Analytics' },
    { value: 'policies', label: 'Policy Analytics' },
    { value: 'commissions', label: 'Commission Analytics' },
    { value: 'forecasts', label: 'Forecasts & Projections' },
  ];

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Add loading check
  if (!clientMetrics || !policyMetrics || !commissionMetrics) {
    return (
      <div className="policy-container p-6 max-w-7xl mx-auto">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="policy-container p-6 max-w-7xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-gray-500">Comprehensive insights and metrics</p>
        </div>
        <div className="w-64">
          <Select
            value={view}
            onChange={(value) => setView(value as typeof view)}
            options={viewOptions}
          />
        </div>
      </div>

      {view === 'overview' && (
        <>
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard
              title="Total Clients"
              value={clientMetrics.totalClients}
              subtitle="Unique clients"
              icon={<Users className="w-5 h-5" />}
              color="blue"
            />
            <MetricsCard
              title="Active Policies"
              value={policyMetrics.activePolicies}
              subtitle={`${policyMetrics.retentionRate.toFixed(0)}% retention`}
              icon={<FileText className="w-5 h-5" />}
              color="green"
            />
            <MetricsCard
              title="Commission Earned"
              value={formatCurrency(commissionMetrics.totalEarned)}
              subtitle={`${formatCurrency(commissionMetrics.totalPending)} pending`}
              icon={<DollarSign className="w-5 h-5" />}
              color="purple"
              trend={{
                value: commissionMetrics.yearOverYearGrowth,
                isPositive: commissionMetrics.yearOverYearGrowth > 0,
              }}
            />
            <MetricsCard
              title="Projected Annual"
              value={formatCurrency(forecastMetrics.projectedNextYear)}
              subtitle={`${forecastMetrics.monthlyGrowthRate.toFixed(1)}% monthly growth`}
              icon={<TrendingUp className="w-5 h-5" />}
              color="yellow"
              trend={{
                value: forecastMetrics.monthlyGrowthRate,
                isPositive: forecastMetrics.monthlyGrowthRate > 0,
              }}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Monthly Commission Earnings"
              data={commissionMetrics.monthlyEarnings}
              type="bar"
              valuePrefix="$"
              height={250}
            />
            <ChartCard
              title="New Policies Trend"
              data={policyMetrics.monthlyNewPolicies.map(item => ({
                label: item.month,
                value: item.count
              }))}
              type="line"
              height={250}
            />
          </div>

          {/* Performance Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PerformanceTable
              title="Top Performing Carriers"
              data={carrierPerformance.slice(0, 5)}
              type="carrier"
            />
            <PerformanceTable
              title="Product Performance"
              data={productPerformance}
              type="product"
            />
          </div>
        </>
      )}

      {view === 'clients' && (
        <>
          {/* Client Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricsCard
              title="Total Clients"
              value={clientMetrics.totalClients}
              subtitle="Unique clients"
              icon={<Users className="w-5 h-5" />}
              color="blue"
            />
            <MetricsCard
              title="Average Age"
              value={Math.round(clientMetrics.averageAge)}
              subtitle="Years old"
              icon={<Users className="w-5 h-5" />}
              color="green"
            />
            <MetricsCard
              title="Avg Lifetime Value"
              value={formatCurrency(clientMetrics.averageLifetimeValue)}
              subtitle="Per client"
              icon={<DollarSign className="w-5 h-5" />}
              color="purple"
            />
          </div>

          {/* Client Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* State Distribution */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium mb-4">Client Distribution by State</h3>
              <div className="space-y-2">
                {Object.entries(clientMetrics.stateDistribution)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([state, count]) => (
                    <div key={state} className="flex justify-between items-center">
                      <span className="text-sm">{state}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(count / clientMetrics.totalClients) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Age Distribution */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium mb-4">Age Distribution</h3>
              <div className="space-y-2">
                {clientMetrics.ageDistribution.map((ageGroup) => (
                    <div key={ageGroup.range} className="flex justify-between items-center">
                      <span className="text-sm">{ageGroup.range} years</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${ageGroup.percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{ageGroup.count}</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Top Clients */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Top Clients by Value</h3>
            <div className="space-y-3">
              {clientMetrics.topClients.map((client, index) => (
                <div key={client.name} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                    <span className="font-medium">{client.name}</span>
                  </div>
                  <span className="font-medium text-green-600">
                    {formatCurrency(client.value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {view === 'policies' && (
        <>
          {/* Policy Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard
              title="Total Policies"
              value={policyMetrics.totalPolicies}
              subtitle="All time"
              icon={<FileText className="w-5 h-5" />}
              color="blue"
            />
            <MetricsCard
              title="Active Policies"
              value={policyMetrics.activePolicies}
              subtitle={`${policyMetrics.retentionRate.toFixed(0)}% retention`}
              icon={<FileText className="w-5 h-5" />}
              color="green"
            />
            <MetricsCard
              title="Lapsed Policies"
              value={policyMetrics.lapsedPolicies}
              subtitle="Need attention"
              icon={<AlertCircle className="w-5 h-5" />}
              color="red"
            />
            <MetricsCard
              title="Avg Premium"
              value={formatCurrency(policyMetrics.averagePremium)}
              subtitle="Per policy"
              icon={<DollarSign className="w-5 h-5" />}
              color="purple"
            />
          </div>

          {/* Policy Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="New Policies by Month"
              data={policyMetrics.monthlyNewPolicies.map(item => ({
                label: item.month,
                value: item.count
              }))}
              type="bar"
              height={250}
            />

            {/* Status Breakdown */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium mb-4">Policy Status Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(policyMetrics.statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex justify-between items-center">
                    <span className="capitalize">{status}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            status === 'active' ? 'bg-green-500' :
                            status === 'pending' ? 'bg-yellow-500' :
                            status === 'lapsed' ? 'bg-red-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${(count / policyMetrics.totalPolicies) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-12 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Alert Box */}
          {policyMetrics.expiringPolicies > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-900">
                  {policyMetrics.expiringPolicies} Policies Expiring Soon
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  You have {policyMetrics.expiringPolicies} policies expiring in the next 30 days.
                  Consider reaching out to clients for renewal discussions.
                </p>
              </div>
            </div>
          )}

          {/* Product Performance */}
          <PerformanceTable
            title="Product Performance"
            data={productPerformance}
            type="product"
          />
        </>
      )}

      {view === 'commissions' && (
        <>
          {/* Commission Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard
              title="Total Earned"
              value={formatCurrency(commissionMetrics.totalEarned)}
              subtitle="Paid commissions"
              icon={<DollarSign className="w-5 h-5" />}
              color="green"
            />
            <MetricsCard
              title="Pending"
              value={formatCurrency(commissionMetrics.totalPending)}
              subtitle="Awaiting payment"
              icon={<DollarSign className="w-5 h-5" />}
              color="yellow"
            />
            <MetricsCard
              title="Avg Commission Rate"
              value={`${commissionMetrics.averageCommissionRate.toFixed(1)}%`}
              subtitle="Across all products"
              icon={<TrendingUp className="w-5 h-5" />}
              color="blue"
            />
            <MetricsCard
              title="YoY Growth"
              value={`${Math.abs(commissionMetrics.yearOverYearGrowth).toFixed(0)}%`}
              subtitle="Year over year"
              icon={<TrendingUp className="w-5 h-5" />}
              color={commissionMetrics.yearOverYearGrowth >= 0 ? 'green' : 'red'}
              trend={{
                value: commissionMetrics.yearOverYearGrowth,
                isPositive: commissionMetrics.yearOverYearGrowth > 0,
              }}
            />
          </div>

          {/* Commission Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Monthly Commission Earnings"
              data={commissionMetrics.monthlyEarnings}
              type="bar"
              valuePrefix="$"
              height={250}
            />

            {/* Commission by Type */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium mb-4">Commission by Type</h3>
              <div className="space-y-3">
                {Object.entries(commissionMetrics.commissionByType).map(([type, amount]) => (
                  <div key={type} className="flex justify-between items-center">
                    <span className="capitalize">{type.replace('_', ' ')}</span>
                    <div className="flex items-center gap-4">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full"
                          style={{
                            width: `${(amount / (commissionMetrics.totalEarned + commissionMetrics.totalPending)) * 100}%`
                          }}
                        />
                      </div>
                      <span className="font-medium text-green-600 w-20 text-right">
                        {formatCurrency(amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <PerformanceTable
              title="Carrier Commission Performance"
              data={carrierPerformance}
              type="carrier"
            />
            <PerformanceTable
              title="State Commission Performance"
              data={statePerformance.slice(0, 5)}
              type="state"
            />
          </div>
        </>
      )}

      {view === 'forecasts' && (
        <>
          {/* Forecast Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricsCard
              title="Next Quarter"
              value={formatCurrency(forecastMetrics.projectedNextQuarter)}
              subtitle="Projected commission"
              icon={<Target className="w-5 h-5" />}
              color="blue"
            />
            <MetricsCard
              title="Next Year"
              value={formatCurrency(forecastMetrics.projectedNextYear)}
              subtitle="Annual projection"
              icon={<TrendingUp className="w-5 h-5" />}
              color="green"
            />
            <MetricsCard
              title="Pipeline Value"
              value={formatCurrency(forecastMetrics.pipelineValue)}
              subtitle="Pending policies"
              icon={<DollarSign className="w-5 h-5" />}
              color="yellow"
            />
            <MetricsCard
              title="Expected Renewals"
              value={formatCurrency(forecastMetrics.expectedRenewals)}
              subtitle="Annual renewals"
              icon={<DollarSign className="w-5 h-5" />}
              color="purple"
            />
          </div>

          {/* Growth Opportunities */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-medium mb-4">Growth Opportunities</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* High Value Products */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  High Value Products
                </h4>
                <div className="space-y-1">
                  {forecastMetrics.growthOpportunities.highValueProducts.length > 0 ? (
                    forecastMetrics.growthOpportunities.highValueProducts.map(product => (
                      <div key={product} className="text-sm text-gray-600 capitalize">
                        • {product.replace('_', ' ')}
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-400">No high-value products identified</div>
                  )}
                </div>
              </div>

              {/* High Value Products */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  High Value Products
                </h4>
                <div className="space-y-1">
                  {forecastMetrics.growthOpportunities.highValueProducts.map((product: string) => (
                    <div key={product} className="text-sm text-gray-600">
                      • {product.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </div>
                  ))}
                </div>
              </div>

              {/* Underserved States */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Market Expansion
                </h4>
                <div className="text-sm text-gray-600">
                  Consider expanding to new states based on current performance
                  and market opportunities.
                </div>
              </div>
            </div>
          </div>

          {/* Projection Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard
              title="Historical Commission Trend"
              data={commissionMetrics.monthlyEarnings}
              type="line"
              valuePrefix="$"
              height={250}
            />
            <ChartCard
              title="Policy Growth Trend"
              data={policyMetrics.monthlyNewPolicies.map(item => ({
                label: item.month,
                value: item.count
              }))}
              type="bar"
              height={250}
            />
          </div>

          {/* Key Insights */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Key Insights & Recommendations</h4>
            <ul className="space-y-1 text-sm text-blue-700">
              <li>• Monthly growth rate is {forecastMetrics.monthlyGrowthRate.toFixed(1)}%</li>
              <li>• Focus on {carrierPerformance[0]?.carrierName || 'top carriers'} for best commission rates</li>
              <li>• {policyMetrics.expiringPolicies} policies expiring soon - opportunity for renewal commissions</li>
              <li>• Consider expanding {productPerformance[0]?.product.replace('_', ' ') || 'top products'} offerings</li>
            </ul>
          </div>
        </>
      )}
      </div>
    </div>
  );
};