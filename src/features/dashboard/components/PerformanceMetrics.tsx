import React from 'react';
import { BarChart3, Trophy, TrendingUp } from 'lucide-react';

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

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(26, 26, 26, 0.08)',
        marginBottom: '24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <div
          style={{
            padding: '12px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #1a1a1a 0%, #2d3748 100%)',
            boxShadow: '0 4px 12px rgba(26, 26, 26, 0.15)',
          }}
        >
          <BarChart3 size={24} color="#f8f9fa" />
        </div>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            Performance Metrics
          </h3>
          <p style={{ fontSize: '14px', color: '#4a5568', margin: 0 }}>
            Production KPIs and top performers
          </p>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Total Policies
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {totalPolicies}
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Active Policies
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {activePolicies}
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Retention Rate
          </div>
          <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {retentionRate.toFixed(0)}%
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
            boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
          }}
        >
          <div style={{ fontSize: '11px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Avg Commission
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {formatCurrency(averageCommissionPerPolicy)}
          </div>
          <div style={{ fontSize: '10px', color: '#656d76', marginTop: '2px' }}>
            per policy
          </div>
        </div>
      </div>

      {/* Top Performers Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Top Products */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
            boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Trophy size={16} color="#1a1a1a" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Top Products
            </span>
          </div>

          {topProducts && topProducts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topProducts.slice(0, 3).map((product, index) => (
                <div
                  key={product.product}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(26, 26, 26, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: index === 0
                          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                          : index === 1
                          ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                          : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>
                        {formatProductName(product.product)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#656d76' }}>
                        {product.policies} {product.policies === 1 ? 'policy' : 'policies'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
                    {formatCurrency(product.revenue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>
              No product data available
            </div>
          )}
        </div>

        {/* Top Carriers */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
            boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={16} color="#1a1a1a" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Top Carriers
            </span>
          </div>

          {topCarriers && topCarriers.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {topCarriers.slice(0, 3).map((carrier, index) => (
                <div
                  key={carrier.carrierId}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    boxShadow: '0 1px 3px rgba(26, 26, 26, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '6px',
                        background: index === 0
                          ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'
                          : index === 1
                          ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                          : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 700,
                        color: '#ffffff',
                      }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>
                        {carrier.carrierName}
                      </div>
                      <div style={{ fontSize: '11px', color: '#656d76' }}>
                        {carrier.policies} {carrier.policies === 1 ? 'policy' : 'policies'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
                    {formatCurrency(carrier.revenue)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af', fontSize: '13px' }}>
              No carrier data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
