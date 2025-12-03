// src/features/analytics/components/CarriersProductsBreakdown.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAnalyticsData } from '../../../hooks';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import { AnalyticsTable, AnalyticsHeading } from './shared';

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

/**
 * CarriersProductsBreakdown - Compact table view of carriers and products
 * Ultra-compact display with shared components
 */
export function CarriersProductsBreakdown() {
  const { dateRange } = useAnalyticsDateRange();
  const { raw, isLoading } = useAnalyticsData({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  if (isLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="p-2">
          <div className="text-[11px] font-medium text-muted-foreground uppercase">
            Carriers & Products
          </div>
          <div className="p-3 text-center text-[10px] text-muted-foreground">
            Loading...
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

  // Sort carriers by total premium
  const sortedCarriers = Array.from(carrierMap.values()).sort((a, b) => b.totalPremium - a.totalPremium);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Prepare flattened data for table
  const tableData: any[] = [];
  sortedCarriers.forEach(carrier => {
    // Add carrier summary row
    tableData.push({
      isCarrier: true,
      name: carrier.carrier,
      policies: carrier.totalPolicies,
      premium: carrier.totalPremium,
      avgRate: carrier.avgCommissionRate,
      commission: carrier.totalCommissions
    });

    // Add product rows (top 3 products per carrier)
    carrier.products
      .sort((a, b) => b.totalPremium - a.totalPremium)
      .slice(0, 3)
      .forEach(product => {
        tableData.push({
          isCarrier: false,
          name: `  → ${product.name}`,
          policies: product.policyCount,
          premium: product.totalPremium,
          avgRate: product.avgCommissionRate,
          commission: product.totalCommissions
        });
      });
  });

  return (
    <Card className="border-border/50">
      <CardContent className="p-2">
        <AnalyticsHeading
          title="Carriers & Products"
          subtitle={`${sortedCarriers.length} carriers`}
        />

        <AnalyticsTable
          columns={[
            {
              key: 'name',
              header: 'Carrier / Product',
              render: (value: string, row: any) => (
                <span className={cn(
                  row.isCarrier ? "font-semibold" : "text-[9px] text-muted-foreground"
                )}>
                  {value}
                </span>
              )
            },
            {
              key: 'policies',
              header: 'Policies',
              align: 'right' as const,
              className: 'font-mono'
            },
            {
              key: 'premium',
              header: 'Premium',
              align: 'right' as const,
              render: (value: number) => formatCurrency(value),
              className: 'font-mono'
            },
            {
              key: 'avgRate',
              header: 'Rate',
              align: 'right' as const,
              render: (value: number) => `${value.toFixed(1)}%`,
              className: 'font-mono text-green-600 dark:text-green-400'
            },
            {
              key: 'commission',
              header: 'Commission',
              align: 'right' as const,
              render: (value: number) => formatCurrency(value),
              className: 'font-mono font-semibold'
            }
          ]}
          data={tableData}
          emptyMessage="No carrier data available"
        />
      </CardContent>
    </Card>
  );
}
