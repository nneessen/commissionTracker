// src/features/analytics/components/ProductMatrix.tsx

import React from 'react';
import { useAnalyticsData } from '../../../hooks';

/**
 * ProductMatrix - Product performance matrix
 */
export function ProductMatrix() {
  const { attribution, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          Loading product data...
        </div>
      </div>
    );
  }

  const { productMix } = attribution;
  const latestMonth = productMix[productMix.length - 1];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Product Mix - {latestMonth?.periodLabel}
      </div>

      <div style={{ display: 'grid', gap: '8px' }}>
        {latestMonth?.productBreakdown.map((product, idx) => (
          <div
            key={product.product}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px',
              background: idx === 0 ? '#f0f9ff' : '#f8f9fa',
              borderRadius: '6px'
            }}
          >
            <div>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#1a1a1a',
                marginBottom: '4px'
              }}>
                {product.product}
              </div>
              <div style={{
                fontSize: '10px',
                color: '#656d76'
              }}>
                {product.count} policies · {product.percentage.toFixed(1)}%
              </div>
            </div>
            <div style={{
              fontSize: '14px',
              fontWeight: 700,
              color: '#3b82f6',
              fontFamily: 'Monaco, monospace'
            }}>
              {formatCurrency(product.revenue)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
