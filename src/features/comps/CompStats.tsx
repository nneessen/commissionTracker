import React from 'react';
import {BarChart3, Building2, Package, Percent, TrendingUp} from 'lucide-react';
import {useComps} from '../../hooks/comps';

export function CompStats() {
  const { data: comps, isLoading, error } = useComps();

  // Calculate statistics from comps data
  const stats = comps ? {
    totalProducts: comps.length,
    avgCommission: comps.reduce((sum, c) => sum + c.commission_percentage, 0) / comps.length || 0,
    activeCarriers: new Set(comps.map(c => c.carrier_id)).size,
    productTypes: new Set(comps.map(c => c.product_type)).size,
    topRate: Math.max(...comps.map(c => c.commission_percentage), 0)
  } : null;

  if (isLoading) {
    return (
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-lg shadow-md p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted/50 rounded w-3/4 mb-3"></div>
                <div className="h-8 bg-muted/50 rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted/50 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="mb-6 p-4 bg-gradient-to-r from-destructive/20 via-error/10 to-card rounded-lg shadow-md">
        <p className="text-sm text-destructive">Failed to load comp statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Products',
      value: stats.totalProducts.toLocaleString(),
      description: 'Compensation rates in database',
      icon: BarChart3,
      color: 'text-info',
      bgColor: 'bg-gradient-to-br from-info/20 via-status-earned/10 to-card'
    },
    {
      name: 'Carriers',
      value: stats.activeCarriers.toLocaleString(),
      description: 'Insurance carriers',
      icon: Building2,
      color: 'text-success',
      bgColor: 'bg-gradient-to-br from-success/20 via-status-active/10 to-card'
    },
    {
      name: 'Product Types',
      value: stats.productTypes.toLocaleString(),
      description: 'Different product categories',
      icon: Package,
      color: 'text-primary',
      bgColor: 'bg-gradient-to-br from-primary/20 via-accent/10 to-card'
    },
    {
      name: 'Average Commission',
      value: `${stats.avgCommission.toFixed(1)}%`,
      description: 'Across all products & carriers',
      icon: TrendingUp,
      color: 'text-warning',
      bgColor: 'bg-gradient-to-br from-warning/20 via-status-pending/10 to-card'
    }
  ];

  return (
    <div className="mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-foreground">Comp Guide Overview</h3>
        <p className="text-sm text-muted-foreground">Current FFG compensation data summary</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className={`rounded-lg shadow-md p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${stat.bgColor}`}
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 rounded-md p-3 shadow-sm bg-card">
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-baseline">
                    <p className={`text-2xl font-semibold font-mono ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">
                    {stat.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
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
        <div className="bg-gradient-to-r from-info/15 via-status-earned/10 to-card rounded-lg p-4 shadow-md">
          <div className="flex items-center">
            <Percent className="h-5 w-5 text-info mr-2" />
            <h4 className="text-sm font-medium text-foreground">Commission Range</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Commission rates typically range from 50% to 150% depending on carrier, product, and contract level.
          </p>
        </div>

        <div className="bg-gradient-to-r from-success/15 via-status-active/10 to-card rounded-lg p-4 shadow-md">
          <div className="flex items-center">
            <TrendingUp className="h-5 w-5 text-success mr-2" />
            <h4 className="text-sm font-medium text-foreground">Rate Updates</h4>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Commission rates are updated regularly to reflect current carrier offerings and contract terms.
          </p>
        </div>
      </div>
    </div>
  );
}

export default CompStats;
