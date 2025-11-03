// src/features/analytics/components/CarriersProductsBreakdown.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAnalyticsData } from '../../../hooks';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import { Building2, Package, TrendingUp, TrendingDown } from 'lucide-react';

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
}

/**
 * CarriersProductsBreakdown - Hierarchical display of carriers and their products
 * Shows products grouped by carrier with clear metrics
 */
export function CarriersProductsBreakdown() {
  const { dateRange } = useAnalyticsDateRange();
  const { raw, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wide">
            Carriers & Products Performance
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

  // Helper function to format product names (whole_life -> Whole Life)
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
      // Calculate average commission rate
      if (productData.totalPremium > 0) {
        productData.avgCommissionRate = (productData.totalCommissions / productData.totalPremium) * 100;
      }
    }

    // Update carrier totals
    carrierData.totalPolicies++;
    carrierData.totalPremium += policy.annualPremium || 0;
    carrierData.totalCommissions += commission?.amount || 0;
  });

  // Sort carriers by total premium (descending)
  const sortedCarriers = Array.from(carrierMap.values()).sort(
    (a, b) => b.totalPremium - a.totalPremium
  );

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

  // Calculate grand totals
  const grandTotals = sortedCarriers.reduce(
    (totals, carrier) => ({
      policies: totals.policies + carrier.totalPolicies,
      premium: totals.premium + carrier.totalPremium,
      commissions: totals.commissions + carrier.totalCommissions,
    }),
    { policies: 0, premium: 0, commissions: 0 }
  );

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Carriers & Products Breakdown
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Products organized by insurance carrier
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="bg-gradient-to-br from-primary/10 to-card p-2 rounded-lg">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Total Carriers
            </div>
            <div className="text-lg font-bold text-foreground">
              {sortedCarriers.length}
            </div>
          </div>
          <div className="bg-gradient-to-br from-success/10 to-card p-2 rounded-lg">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Total Premium
            </div>
            <div className="text-lg font-bold text-success">
              {formatCurrency(grandTotals.premium)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-info/10 to-card p-2 rounded-lg">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
              Total Commissions
            </div>
            <div className="text-lg font-bold text-info">
              {formatCurrency(grandTotals.commissions)}
            </div>
          </div>
        </div>

        {/* Carriers List */}
        <div className="space-y-3">
          {sortedCarriers.slice(0, 5).map((carrier, index) => {
            const avgCarrierCommissionRate = carrier.totalPremium > 0
              ? (carrier.totalCommissions / carrier.totalPremium) * 100
              : 0;

            return (
              <div
                key={carrier.carrier}
                className="border border-border rounded-lg overflow-hidden"
              >
                {/* Carrier Header */}
                <div className="bg-muted/30 p-3 border-b border-border">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm text-foreground">
                        {carrier.carrier}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({carrier.totalPolicies} policies)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Premium</div>
                        <div className="text-sm font-semibold text-foreground">
                          {formatCurrency(carrier.totalPremium)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Avg Rate</div>
                        <div className="text-sm font-semibold text-success">
                          {formatPercent(avgCarrierCommissionRate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Products List */}
                <div className="divide-y divide-border">
                  {carrier.products
                    .sort((a, b) => b.totalPremium - a.totalPremium)
                    .map(product => {
                      const percentOfCarrier = carrier.totalPremium > 0
                        ? (product.totalPremium / carrier.totalPremium) * 100
                        : 0;

                      return (
                        <div
                          key={`${carrier.carrier}-${product.name}`}
                          className="p-2 pl-8 hover:bg-muted/20 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <Package className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs font-medium text-foreground">
                                {product.name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ({product.policyCount} {product.policyCount === 1 ? 'policy' : 'policies'})
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              {/* Percentage of Carrier */}
                              <div className="text-xs text-muted-foreground">
                                {formatPercent(percentOfCarrier)} of carrier
                              </div>

                              {/* Premium */}
                              <div className="text-xs font-semibold text-foreground font-mono">
                                {formatCurrency(product.totalPremium)}
                              </div>

                              {/* Commission Rate with Trend */}
                              <div className="flex items-center gap-1">
                                {product.avgCommissionRate >= avgCarrierCommissionRate ? (
                                  <TrendingUp className="h-3 w-3 text-success" />
                                ) : (
                                  <TrendingDown className="h-3 w-3 text-destructive" />
                                )}
                                <span className={cn(
                                  "text-xs font-semibold",
                                  product.avgCommissionRate >= avgCarrierCommissionRate
                                    ? "text-success"
                                    : "text-destructive"
                                )}>
                                  {formatPercent(product.avgCommissionRate)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        {sortedCarriers.length > 5 && (
          <div className="mt-4 p-3 bg-muted/20 rounded-lg">
            <div className="text-xs text-muted-foreground">
              Showing top 5 of {sortedCarriers.length} carriers by premium volume
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}