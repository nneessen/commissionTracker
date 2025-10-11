// src/features/analytics/components/ClientSegmentation.tsx

import React from 'react';
import { useAnalyticsData } from '../../../hooks';

/**
 * ClientSegmentation - Client value segmentation and opportunities
 *
 * Segments clients by value (High/Medium/Low) and identifies cross-sell opportunities
 */
export function ClientSegmentation() {
  const { segmentation, isLoading } = useAnalyticsData();

  if (isLoading) {
    return (
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '20px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}>
          Loading segmentation data...
        </div>
      </div>
    );
  }

  const { segments: segmentData, crossSell } = segmentation;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getSegmentColor = (tier: string) => {
    if (tier === 'high') return { bg: '#f0fdf4', border: '#dcfce7', text: '#10b981' };
    if (tier === 'medium') return { bg: '#f0f9ff', border: '#e0f2fe', text: '#3b82f6' };
    return { bg: '#fef2f2', border: '#fee2e2', text: '#ef4444' };
  };

  // Transform segmentation data into displayable format
  const totalRevenue = segmentData.totalPremiumByTier.high + segmentData.totalPremiumByTier.medium + segmentData.totalPremiumByTier.low;

  const segments = [
    {
      tier: 'high',
      clients: segmentData.highValue,
      totalValue: segmentData.totalPremiumByTier.high,
      avgValue: segmentData.avgPremiumByTier.high,
      percentage: totalRevenue > 0 ? (segmentData.totalPremiumByTier.high / totalRevenue) * 100 : 0,
    },
    {
      tier: 'medium',
      clients: segmentData.mediumValue,
      totalValue: segmentData.totalPremiumByTier.medium,
      avgValue: segmentData.avgPremiumByTier.medium,
      percentage: totalRevenue > 0 ? (segmentData.totalPremiumByTier.medium / totalRevenue) * 100 : 0,
    },
    {
      tier: 'low',
      clients: segmentData.lowValue,
      totalValue: segmentData.totalPremiumByTier.low,
      avgValue: segmentData.avgPremiumByTier.low,
      percentage: totalRevenue > 0 ? (segmentData.totalPremiumByTier.low / totalRevenue) * 100 : 0,
    },
  ];

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      {/* Header */}
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '20px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        Client Segmentation
      </div>

      {/* Segments Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '12px',
        marginBottom: '24px'
      }}>
        {segments.map(segment => {
          const colors = getSegmentColor(segment.tier);
          return (
            <div
              key={segment.tier}
              style={{
                padding: '16px',
                background: colors.bg,
                borderRadius: '8px',
                border: `1px solid ${colors.border}`
              }}
            >
              <div style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#656d76',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '8px'
              }}>
                {segment.tier.toUpperCase()} VALUE
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                color: colors.text,
                fontFamily: 'Monaco, monospace',
                marginBottom: '8px'
              }}>
                {segment.clients.length}
              </div>
              <div style={{
                fontSize: '12px',
                fontWeight: 600,
                color: colors.text,
                marginBottom: '4px'
              }}>
                {formatCurrency(segment.totalValue)}
              </div>
              <div style={{
                fontSize: '10px',
                color: '#656d76'
              }}>
                Avg: {formatCurrency(segment.avgValue)} · {segment.percentage.toFixed(0)}% of revenue
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Cross-Sell Opportunities */}
      <div>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#1a1a1a',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Top Cross-Sell Opportunities
        </div>
        <div style={{ display: 'grid', gap: '8px' }}>
          {crossSell.slice(0, 5).map((opp, idx) => (
            <div
              key={opp.clientName}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px',
                background: idx === 0 ? '#f0fdf4' : '#f8f9fa',
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
                  {opp.clientName}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: '#656d76'
                }}>
                  {opp.currentPolicies} policies · {formatCurrency(opp.estimatedValue)} potential
                </div>
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: idx === 0 ? '#10b981' : '#3b82f6',
                  fontFamily: 'Monaco, monospace'
                }}>
                  {opp.opportunityScore}
                </div>
                <div style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  color: '#656d76',
                  textTransform: 'uppercase'
                }}>
                  Score
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
