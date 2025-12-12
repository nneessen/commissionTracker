// src/features/dashboard/components/PerformanceMetrics.tsx

import React from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {BarChart3, Trophy, TrendingUp} from 'lucide-react';
import {cn} from '@/lib/utils';

interface ProductPerformance {
  product: string;
  policies: number;
  revenue: number;
}

interface CarrierPerformance {
  carrierId: string;
  carrierName: string;
  policies: number;
  revenue: number;
}

interface PerformanceMetricsProps {
  totalPolicies: number;
  activePolicies: number;
  retentionRate: number;
  averageCommissionPerPolicy: number;
  topProducts: ProductPerformance[];
  topCarriers: CarrierPerformance[];
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  totalPolicies,
  activePolicies,
  retentionRate,
  averageCommissionPerPolicy,
  topProducts,
  topCarriers,
}) => {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatProductName = (product: string) => {
    return product
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getRankBadgeClass = (index: number): string => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-br from-warning to-warning/80 text-warning-foreground shadow-lg';
      case 1:
        return 'bg-gradient-to-br from-muted to-muted/60 text-foreground shadow-md';
      case 2:
        return 'bg-gradient-to-br from-status-lapsed to-status-lapsed/80 text-foreground shadow-md';
      default:
        return 'bg-gradient-to-br from-muted-foreground to-muted-foreground/80 text-foreground shadow-sm';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-card via-accent/5 to-card mb-6 shadow-xl">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg">
            <BarChart3 size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground m-0">
              Performance Metrics
            </h3>
            <p className="text-sm text-muted-foreground m-0">
              Production KPIs and top performers
            </p>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-status-earned/20 via-info/10 to-card shadow-md rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
              Total Policies
            </div>
            <div className="text-3xl font-bold text-status-earned font-mono">
              {totalPolicies}
            </div>
          </div>

          <div className="bg-gradient-to-br from-status-active/20 via-success/10 to-card shadow-md rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
              Active Policies
            </div>
            <div className="text-3xl font-bold text-status-active font-mono">
              {activePolicies}
            </div>
          </div>

          <div className="bg-gradient-to-br from-status-pending/20 via-warning/10 to-card shadow-md rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
              Retention Rate
            </div>
            <div className="text-3xl font-bold text-status-pending font-mono">
              {retentionRate.toFixed(0)}%
            </div>
          </div>

          <div className="bg-gradient-to-br from-primary/15 via-accent/10 to-card shadow-md rounded-lg p-4">
            <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
              Avg Commission
            </div>
            <div className="text-xl font-bold text-primary font-mono">
              {formatCurrency(averageCommissionPerPolicy)}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              per policy
            </div>
          </div>
        </div>

        {/* Top Performers Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Products */}
          <div className="bg-gradient-to-br from-accent/10 to-card shadow-lg rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy size={16} className="text-warning" />
              <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Top Products
              </span>
            </div>

            {topProducts && topProducts.length > 0 ? (
              <div className="flex flex-col gap-3">
                {topProducts.slice(0, 3).map((product, index) => (
                  <div key={product.product} className="bg-gradient-to-r from-card to-accent/5 shadow-md rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={cn(
                            "w-6 h-6 flex items-center justify-center text-xs font-bold rounded-md",
                            getRankBadgeClass(index)
                          )}
                        >
                          {index + 1}
                        </Badge>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {formatProductName(product.product)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {product.policies} {product.policies === 1 ? 'policy' : 'policies'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-success font-mono">
                        {formatCurrency(product.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-5 text-muted-foreground text-sm">
                No product data available
              </div>
            )}
          </div>

          {/* Top Carriers */}
          <div className="bg-gradient-to-br from-accent/10 to-card shadow-lg rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-status-active" />
              <span className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Top Carriers
              </span>
            </div>

            {topCarriers && topCarriers.length > 0 ? (
              <div className="flex flex-col gap-3">
                {topCarriers.slice(0, 3).map((carrier, index) => (
                  <div key={carrier.carrierId} className="bg-gradient-to-r from-card to-accent/5 shadow-md rounded-lg p-3">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Badge
                          className={cn(
                            "w-6 h-6 flex items-center justify-center text-xs font-bold rounded-md",
                            getRankBadgeClass(index)
                          )}
                        >
                          {index + 1}
                        </Badge>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {carrier.carrierName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {carrier.policies} {carrier.policies === 1 ? 'policy' : 'policies'}
                          </div>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-success font-mono">
                        {formatCurrency(carrier.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-5 text-muted-foreground text-sm">
                No carrier data available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
