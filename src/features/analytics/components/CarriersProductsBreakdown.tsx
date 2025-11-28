// src/features/analytics/components/CarriersProductsBreakdown.tsx

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAnalyticsData } from '../../../hooks';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import { Building2, Package, ArrowUpDown } from 'lucide-react';

interface CarrierProductData {
  carrier: string;
  products: {
    name: string;
    policyCount: number;
    totalPremium: number;
    avgCommissionRate: number;
    totalCommissions: number;
  }[];
  totalPolicies: number;
  totalPremium: number;
  totalCommissions: number;
  avgCommissionRate: number;
}

type SortColumn = 'carrier' | 'policies' | 'premium' | 'avgRate' | 'commission';

/**
 * CarriersProductsBreakdown - Compact table view of carriers and products
 * Always shows products (no expand/collapse) for quick scanning
 */
export function CarriersProductsBreakdown() {
  const { dateRange } = useAnalyticsDateRange();
  const { raw, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const [sortColumn, setSortColumn] = useState<SortColumn>('premium');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Carriers & Products
          </div>
          <div className="p-10 text-center text-muted-foreground text-xs">
            Loading carrier data...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Create a map of carrier IDs to names
  const carrierIdToName = new Map<string, string>();
  raw.carriers?.forEach(carrier => {
    carrierIdToName.set(carrier.id, carrier.name);
  });

  // Helper function to format product names
  const formatProductName = (product: string): string => {
    return product
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  // Group data by carrier and product
  const carrierMap = new Map<string, CarrierProductData>();

  raw.policies.forEach(policy => {
    const carrierName = policy.carrierId ?
      (carrierIdToName.get(policy.carrierId) || 'Unknown Carrier') :
      'Unknown Carrier';
    const product = policy.product ? formatProductName(policy.product) : 'Unknown Product';
    const commission = raw.commissions.find(c => c.policyId === policy.id);

    if (!carrierMap.has(carrierName)) {
      carrierMap.set(carrierName, {
        carrier: carrierName,
        products: [],
        totalPolicies: 0,
        totalPremium: 0,
        totalCommissions: 0,
        avgCommissionRate: 0,
      });
    }

    const carrierData = carrierMap.get(carrierName)!;

    // Find or create product entry
    let productData = carrierData.products.find(p => p.name === product);
    if (!productData) {
      productData = {
        name: product,
        policyCount: 0,
        totalPremium: 0,
        avgCommissionRate: 0,
        totalCommissions: 0,
      };
      carrierData.products.push(productData);
    }

    // Update product metrics
    productData.policyCount++;
    productData.totalPremium += policy.annualPremium || 0;

    if (commission) {
      productData.totalCommissions += commission.amount || 0;
      if (productData.totalPremium > 0) {
        productData.avgCommissionRate = (productData.totalCommissions / productData.totalPremium) * 100;
      }
    }

    // Update carrier totals
    carrierData.totalPolicies++;
    carrierData.totalPremium += policy.annualPremium || 0;
    carrierData.totalCommissions += commission?.amount || 0;
  });

  // Calculate carrier average commission rates
  carrierMap.forEach((carrier) => {
    if (carrier.totalPremium > 0) {
      carrier.avgCommissionRate = (carrier.totalCommissions / carrier.totalPremium) * 100;
    }
  });

  // Sort carriers
  const sortCarriers = (carriers: CarrierProductData[]) => {
    return carriers.sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'carrier':
          comparison = a.carrier.localeCompare(b.carrier);
          break;
        case 'policies':
          comparison = a.totalPolicies - b.totalPolicies;
          break;
        case 'premium':
          comparison = a.totalPremium - b.totalPremium;
          break;
        case 'avgRate':
          comparison = a.avgCommissionRate - b.avgCommissionRate;
          break;
        case 'commission':
          comparison = a.totalCommissions - b.totalCommissions;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const sortedCarriers = sortCarriers(Array.from(carrierMap.values()));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-4">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Carriers & Products
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {sortedCarriers.length} carriers with nested products
          </div>
        </div>

        {/* Table */}
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th
                  className="text-left p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                  onClick={() => handleSort('carrier')}
                  style={{ width: '30%' }}
                >
                  <div className="flex items-center gap-1">
                    <span>Carrier / Product</span>
                    {sortColumn === 'carrier' && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </th>
                <th
                  className="text-right p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                  onClick={() => handleSort('policies')}
                  style={{ width: '15%' }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Policies</span>
                    {sortColumn === 'policies' && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </th>
                <th
                  className="text-right p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                  onClick={() => handleSort('premium')}
                  style={{ width: '20%' }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Premium</span>
                    {sortColumn === 'premium' && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </th>
                <th
                  className="text-right p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                  onClick={() => handleSort('avgRate')}
                  style={{ width: '15%' }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Avg Rate</span>
                    {sortColumn === 'avgRate' && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </th>
                <th
                  className="text-right p-2 font-semibold cursor-pointer hover:bg-muted-foreground/10 transition-colors"
                  onClick={() => handleSort('commission')}
                  style={{ width: '20%' }}
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Commission</span>
                    {sortColumn === 'commission' && <ArrowUpDown className="h-3 w-3" />}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedCarriers.map((carrier) => (
                <React.Fragment key={carrier.carrier}>
                  {/* Carrier Row */}
                  <tr className="bg-muted/50 border-t border-border hover:bg-muted/70 transition-colors">
                    <td className="p-2 font-bold">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3 w-3 text-primary" />
                        <span>{carrier.carrier}</span>
                      </div>
                    </td>
                    <td className="p-2 text-right font-semibold">{carrier.totalPolicies}</td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(carrier.totalPremium)}</td>
                    <td className="p-2 text-right font-semibold text-success">
                      {formatPercent(carrier.avgCommissionRate)}
                    </td>
                    <td className="p-2 text-right font-semibold">{formatCurrency(carrier.totalCommissions)}</td>
                  </tr>

                  {/* Product Rows (Always Expanded) */}
                  {carrier.products
                    .sort((a, b) => b.totalPremium - a.totalPremium)
                    .map((product) => (
                      <tr
                        key={`${carrier.carrier}-${product.name}`}
                        className="border-t border-border/50 hover:bg-accent/20 transition-colors"
                      >
                        <td className="p-2 pl-8 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Package className="h-3 w-3" />
                            <span>{product.name}</span>
                          </div>
                        </td>
                        <td className="p-2 text-right text-muted-foreground">{product.policyCount}</td>
                        <td className="p-2 text-right text-muted-foreground font-mono">
                          {formatCurrency(product.totalPremium)}
                        </td>
                        <td className="p-2 text-right text-muted-foreground">
                          {formatPercent(product.avgCommissionRate)}
                        </td>
                        <td className="p-2 text-right text-muted-foreground font-mono">
                          {formatCurrency(product.totalCommissions)}
                        </td>
                      </tr>
                    ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        {sortedCarriers.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-8">
            No carrier data available for the selected time period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
