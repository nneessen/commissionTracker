// src/features/analytics/components/ProductMatrix.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAnalyticsData } from '../../../hooks';
import { cn } from '@/lib/utils';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import { AnalyticsTable, AnalyticsHeading } from './shared';

/**
 * ProductMatrix - Product performance matrix
 */
export function ProductMatrix() {
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
            Product Mix
          </div>
          <div className="p-3 text-center text-[10px] text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Helper function to format product names (whole_life -> Whole Life)
  const formatProductName = (product: string): string => {
    return product
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Aggregate product data from policies
  const productMap = new Map<string, { count: number; revenue: number }>();
  let totalRevenue = 0;

  raw.policies.forEach(policy => {
    const product = policy.product || 'Unknown';
    const revenue = policy.annualPremium || 0;

    const existing = productMap.get(product) || { count: 0, revenue: 0 };
    productMap.set(product, {
      count: existing.count + 1,
      revenue: existing.revenue + revenue
    });

    totalRevenue += revenue;
  });

  // Convert to array and calculate percentages
  const productData = Array.from(productMap.entries())
    .map(([product, data]) => ({
      product: product,
      count: data.count,
      revenue: data.revenue,
      percentage: totalRevenue > 0 ? (data.revenue / totalRevenue) * 100 : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (value: string) => formatProductName(value),
      className: 'font-medium'
    },
    {
      key: 'count',
      header: 'Policies',
      align: 'right' as const,
      className: 'font-mono text-muted-foreground'
    },
    {
      key: 'percentage',
      header: 'Mix %',
      align: 'right' as const,
      render: (value: number) => (
        <span className={cn(
          "font-mono",
          value >= 40 ? "text-green-600 dark:text-green-400" :
          value >= 20 ? "text-amber-600 dark:text-amber-400" :
          "text-red-600 dark:text-red-400"
        )}>
          {value.toFixed(1)}%
        </span>
      )
    },
    {
      key: 'revenue',
      header: 'Revenue',
      align: 'right' as const,
      render: (value: number) => formatCurrency(value),
      className: 'font-mono font-semibold'
    }
  ];

  return (
    <Card className="border-border/50">
      <CardContent className="p-2">
        <AnalyticsHeading
          title="Product Mix"
          subtitle={`${productData.length} products`}
        />
        <AnalyticsTable
          columns={columns}
          data={productData}
          emptyMessage="No product data available"
        />
      </CardContent>
    </Card>
  );
}
