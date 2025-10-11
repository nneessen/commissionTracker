// src/features/analytics/components/ClientSegmentation.tsx

import React, { useState } from 'react';
import { useAnalyticsData } from '../../../hooks';

/**
 * ClientSegmentation - Client value segmentation and opportunities
 *
 * Segments clients by value (High/Medium/Low) and identifies cross-sell opportunities
 */
export function ClientSegmentation() {
  const { segmentation, isLoading } = useAnalyticsData();
  const [showInfo, setShowInfo] = useState(false);

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
      width: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <div style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#1a1a1a',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Client Segmentation
        </div>
        {/* Info Icon Button */}
        <button
          onClick={() => setShowInfo(!showInfo)}
          style={{
            background: '#f0f9ff',
            border: '1px solid #e0f2fe',
            borderRadius: '50%',
            width: '24px',
            height: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 700,
            color: '#3b82f6',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dbeafe';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f0f9ff';
            e.currentTarget.style.transform = 'scale(1)';
          }}
          title="Click for detailed explanation"
        >
          i
        </button>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div style={{
          marginBottom: '20px',
          padding: '16px',
          background: '#f0f9ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          fontSize: '12px',
          lineHeight: '1.8',
          color: '#1e40af'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e40af' }}>
              👥 Understanding Client Segmentation
            </h3>
            <button
              onClick={() => setShowInfo(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#64748b',
                padding: '0',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>What is this?</strong> Client Segmentation divides your clients into three value tiers (High, Medium, Low) based on their total annual premium.
            This helps you identify your most valuable relationships and where to focus your time and energy.
          </div>

          <div style={{ marginBottom: '16px' }}>
            <strong>The Three Tiers:</strong>
          </div>

          <div style={{ marginBottom: '12px', paddingLeft: '16px' }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#10b981' }}>🟢 High Value:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Your top clients with the highest total premiums
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  These are your VIPs - nurture these relationships!
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#3b82f6' }}>🔵 Medium Value:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Solid clients with moderate premiums
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  Great growth opportunities - potential to upgrade to high value
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#ef4444' }}>🔴 Low Value:</strong>
              <div style={{ marginTop: '4px', color: '#475569' }}>
                Clients with lower total premiums
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  May benefit from cross-sell opportunities to increase value
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>Cross-Sell Opportunities:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
              The list shows clients who might benefit from additional policies based on:
              <div style={{ paddingLeft: '12px', marginTop: '4px' }}>
                • Current policy count (fewer = more opportunity)<br/>
                • Client value tier (high value = more receptive)<br/>
                • Missing product types (gaps in coverage)
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px', padding: '12px', background: '#ffffff', borderRadius: '6px' }}>
            <strong>Real Example:</strong>
            <div style={{ fontSize: '11px', marginTop: '8px', color: '#475569' }}>
              John Smith: 3 policies, $15,000 total annual premium<br/>
              • Classified as: <strong style={{ color: '#10b981' }}>High Value</strong><br/>
              • Has: Term Life, Health, Auto<br/>
              • Missing: Disability, Umbrella<br/>
              <div style={{ marginTop: '8px', color: '#1e40af' }}>
                <strong>Opportunity:</strong> Approach with disability insurance - estimated $3,000 additional premium
              </div>
            </div>
          </div>

          <div style={{
            padding: '8px',
            background: '#dbeafe',
            borderRadius: '4px',
            fontSize: '11px',
            textAlign: 'center',
            color: '#1e40af'
          }}>
            💡 <strong>Pro Tip:</strong> Focus 80% of your service time on high-value clients, but don't ignore cross-sell opportunities in medium-value clients!
          </div>
        </div>
      )}

      {/* Segments Overview */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
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
