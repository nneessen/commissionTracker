// src/features/analytics/components/ProductMatrix.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useAnalyticsData } from '../../../hooks';
import { cn } from '@/lib/utils';
import { useAnalyticsDateRange } from '../context/AnalyticsDateContext';
import { Heading } from '@/components/ui/heading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
      <Card>
        <CardContent className="p-3">
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

  return (
    <Card>
      <CardContent className="p-2">
        <Heading
          title="Product Mix"
          subtitle={`${productData.length} products`}
        />
        {productData.length > 0 ? (
          <Table className="text-[11px]">
            <TableHeader>
              <TableRow className="h-7">
                <TableHead className="p-1.5 bg-primary/5">Product</TableHead>
                <TableHead className="p-1.5 bg-primary/5 text-right">Policies</TableHead>
                <TableHead className="p-1.5 bg-primary/5 text-right">Mix %</TableHead>
                <TableHead className="p-1.5 bg-primary/5 text-right">Revenue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productData.map((row, idx) => (
                <TableRow key={idx} className={idx % 2 === 0 ? 'bg-muted/20' : ''}>
                  <TableCell className="p-1.5 font-medium">
                    {formatProductName(row.product)}
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono text-muted-foreground">
                    {row.count}
                  </TableCell>
                  <TableCell className="p-1.5 text-right">
                    <span className={cn(
                      "font-mono",
                      row.percentage >= 40 ? "text-green-600 dark:text-green-400" :
                      row.percentage >= 20 ? "text-amber-600 dark:text-amber-400" :
                      "text-red-600 dark:text-red-400"
                    )}>
                      {row.percentage.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="p-1.5 text-right font-mono font-semibold">
                    {formatCurrency(row.revenue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="p-3 text-center text-[11px] text-muted-foreground/70">
            No product data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
