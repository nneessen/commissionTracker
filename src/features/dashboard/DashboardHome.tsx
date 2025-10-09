// src/features/dashboard/DashboardHome.v2.tsx
// COMPLETELY REDESIGNED - NO CARD GRIDS, DATA-DENSE, PROFESSIONAL

import React from 'react';
import { PageLayout } from '../../components/layout';
import { useExpenseMetrics, useConstants } from '../../hooks';
import { useMetrics } from '../../hooks/useMetrics';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';

export const DashboardHome: React.FC = () => {
  const { data: expenseMetrics } = useExpenseMetrics();
  const { data: constants } = useConstants();
  const { commissionMetrics, policyMetrics, clientMetrics } = useMetrics();

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate real metrics
  const totalExpenses = expenseMetrics?.monthlyTotal || 0; // This is TOTAL not monthly
  const ytdCommission = commissionMetrics?.totalEarned || 0;
  const pendingCommission = commissionMetrics?.totalPending || 0;
  const activePolicies = policyMetrics?.activePolicies || 0;
  const totalPolicies = policyMetrics?.totalPolicies || 0;
  const avgPremium = policyMetrics?.averagePremium || 0;
  const avgCommissionRate = commissionMetrics?.averageCommissionRate || 0;
  const retentionRate = policyMetrics?.retentionRate || 0;
  const lapsedRate = policyMetrics?.lapsedRate || 0;
  const cancellationRate = policyMetrics?.cancellationRate || 0;

  // KPI Calculations
  const breakevenNeeded = totalExpenses - ytdCommission;
  const policiesNeeded = avgPremium > 0 ? Math.ceil(breakevenNeeded / (avgPremium * avgCommissionRate)) : 0;
  const avgCommissionPerPolicy = commissionMetrics?.averageCommissionPerPolicy || 0;
  const totalClients = clientMetrics?.totalClients || 0;
  const policiesPerClient = totalClients > 0 ? (totalPolicies / totalClients).toFixed(2) : '0';
  const clientLifetimeValue = clientMetrics?.clientLifetimeValue || 0;
  const avgClientValue = totalClients > 0 ? clientLifetimeValue / totalClients : 0;

  // Date calculations
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed = now.getDate();
  const monthProgress = (daysPassed / daysInMonth) * 100;

  const isBreakeven = ytdCommission >= totalExpenses;
  const surplusDeficit = ytdCommission - totalExpenses;

  return (
    <PageLayout>
      {/* COMPACT HEADER */}
      <div style={{ marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 4px 0' }}>
          Commission Tracker
        </h1>
        <div style={{ fontSize: '11px', color: '#656d76', display: 'flex', gap: '16px' }}>
          <span>Last Updated: {now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <span>Month Progress: {monthProgress.toFixed(0)}% ({daysPassed}/{daysInMonth} days)</span>
        </div>
      </div>

      {/* MAIN LAYOUT: 3-COLUMN SPLIT */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 320px', gap: '16px', marginBottom: '16px' }}>

        {/* LEFT SIDEBAR - QUICK STATS */}
        <div style={{
          background: 'linear-gradient(180deg, #1a1a1a 0%, #2d3748 100%)',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          color: '#f8f9fa',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #4a5568', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Key Metrics
          </div>

          {/* Stat Item Component */}
          {[
            { label: 'YTD Commission', value: formatCurrency(ytdCommission), trend: surplusDeficit >= 0 ? 'up' : 'down', color: ytdCommission > 0 ? '#10b981' : '#ef4444' },
            { label: 'Pending Pipeline', value: formatCurrency(pendingCommission), color: '#3b82f6' },
            { label: 'Total Expenses', value: formatCurrency(totalExpenses), color: '#f59e0b' },
            { label: 'Surplus/Deficit', value: formatCurrency(Math.abs(surplusDeficit)), trend: surplusDeficit >= 0 ? 'up' : 'down', color: surplusDeficit >= 0 ? '#10b981' : '#ef4444' },
            { label: 'Breakeven Needed', value: formatCurrency(Math.max(0, breakevenNeeded)), color: breakevenNeeded <= 0 ? '#10b981' : '#ef4444' },
            { label: 'Policies Needed', value: policiesNeeded.toString(), color: '#8b5cf6' },
            { label: 'Active Policies', value: activePolicies.toString(), color: '#06b6d4' },
            { label: 'Total Policies', value: totalPolicies.toString(), color: '#64748b' },
            { label: 'Retention Rate', value: formatPercent(retentionRate), color: retentionRate >= 80 ? '#10b981' : '#f59e0b' },
            { label: 'Lapse Rate', value: formatPercent(lapsedRate), color: lapsedRate < 10 ? '#10b981' : '#ef4444' },
            { label: 'Total Clients', value: totalClients.toString(), color: '#ec4899' },
            { label: 'Policies/Client', value: policiesPerClient, color: '#a855f7' },
            { label: 'Avg Premium', value: formatCurrency(avgPremium), color: '#0ea5e9' },
            { label: 'Avg Comm/Policy', value: formatCurrency(avgCommissionPerPolicy), color: '#14b8a6' },
            { label: 'Avg Client LTV', value: formatCurrency(avgClientValue), color: '#f97316' },
          ].map((stat, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '6px 0',
              borderBottom: i < 14 ? '1px solid #374151' : 'none',
            }}>
              <span style={{ fontSize: '10px', color: '#cbd5e0' }}>{stat.label}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {stat.trend && (
                  stat.trend === 'up' ? <TrendingUp size={10} color="#10b981" /> : <TrendingDown size={10} color="#ef4444" />
                )}
                <span style={{ fontSize: '11px', fontWeight: 700, fontFamily: 'Monaco, monospace', color: stat.color }}>
                  {stat.value}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CENTER - MAIN PERFORMANCE TABLE */}
        <div style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Performance Overview
          </div>

          {/* Status Banner */}
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            background: isBreakeven ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)' : 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            {isBreakeven ? <CheckCircle size={20} color="#065f46" /> : <AlertCircle size={20} color="#9a3412" />}
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: isBreakeven ? '#065f46' : '#9a3412' }}>
                {isBreakeven ? '✓ Above Breakeven' : '⚠ Below Breakeven'}
              </div>
              <div style={{ fontSize: '10px', color: isBreakeven ? '#047857' : '#92400e' }}>
                {isBreakeven
                  ? `Surplus of ${formatCurrency(surplusDeficit)}`
                  : `Need ${formatCurrency(breakevenNeeded)} more (${policiesNeeded} policies @ avg)`
                }
              </div>
            </div>
          </div>

          {/* Performance Table */}
          <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ textAlign: 'left', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Metric</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Current</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Target</th>
                <th style={{ textAlign: 'right', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>%</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', fontSize: '9px', letterSpacing: '0.5px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {[
                { metric: 'Commission Income', current: ytdCommission, target: totalExpenses, unit: '$' },
                { metric: 'Active Policies', current: activePolicies, target: 10, unit: '#' },
                { metric: 'Retention Rate', current: retentionRate, target: 85, unit: '%' },
                { metric: 'Avg Policy Premium', current: avgPremium, target: constants?.avgAP || 15000, unit: '$' },
                { metric: 'Commission Rate', current: avgCommissionRate * 100, target: (constants?.commissionRate || 0.2) * 100, unit: '%' },
                { metric: 'Total Clients', current: totalClients, target: 20, unit: '#' },
                { metric: 'Policies per Client', current: parseFloat(policiesPerClient), target: 2, unit: 'x' },
              ].map((row, i) => {
                const pct = row.target > 0 ? (row.current / row.target) * 100 : 0;
                const status = pct >= 100 ? 'hit' : pct >= 75 ? 'good' : pct >= 50 ? 'fair' : 'poor';
                const statusColor = status === 'hit' ? '#10b981' : status === 'good' ? '#3b82f6' : status === 'fair' ? '#f59e0b' : '#ef4444';

                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '8px 4px', color: '#1a1a1a', fontWeight: 500 }}>{row.metric}</td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontFamily: 'Monaco, monospace', fontWeight: 600 }}>
                      {row.unit === '$' ? formatCurrency(row.current) : row.unit === '%' ? formatPercent(row.current) : row.current.toFixed(1)}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', color: '#656d76', fontFamily: 'Monaco, monospace' }}>
                      {row.unit === '$' ? formatCurrency(row.target) : row.unit === '%' ? formatPercent(row.target) : row.target}
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'right', fontWeight: 600, color: statusColor }}>
                      {pct.toFixed(0)}%
                    </td>
                    <td style={{ padding: '8px 4px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: statusColor,
                      }} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* RIGHT SIDEBAR - ALERTS & INSIGHTS */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Alerts */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '10px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Alerts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ytdCommission === 0 && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#fef3c7', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#92400e' }}>No Commissions YTD</div>
                  <div style={{ fontSize: '9px', color: '#78350f', marginTop: '2px' }}>Create commission records for your policies</div>
                </div>
              )}
              {!isBreakeven && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#fed7aa', borderLeft: '3px solid #ea580c' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#7c2d12' }}>Below Breakeven</div>
                  <div style={{ fontSize: '9px', color: '#7c2d12', marginTop: '2px' }}>Need {policiesNeeded} more policies</div>
                </div>
              )}
              {lapsedRate > 10 && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#fee2e2', borderLeft: '3px solid #dc2626' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#991b1b' }}>High Lapse Rate</div>
                  <div style={{ fontSize: '9px', color: '#7f1d1d', marginTop: '2px' }}>{formatPercent(lapsedRate)} of policies lapsed</div>
                </div>
              )}
              {activePolicies === 0 && (
                <div style={{ padding: '8px', borderRadius: '6px', background: '#dbeafe', borderLeft: '3px solid #3b82f6' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, color: '#1e3a8a' }}>Get Started</div>
                  <div style={{ fontSize: '9px', color: '#1e40af', marginTop: '2px' }}>Add your first policy</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '14px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '10px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Quick Actions
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {['Add Policy', 'Record Commission', 'Add Expense', 'View Reports'].map((action, i) => (
                <button
                  key={i}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    background: '#f8f9fa',
                    fontSize: '10px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: '#1a1a1a',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#e2e8f0';
                    e.currentTarget.style.borderColor = '#cbd5e0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  {action}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION - DETAILED KPI GRID */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Detailed KPI Breakdown
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          {[
            { category: 'Financial', kpis: [
              { label: 'YTD Commission', value: formatCurrency(ytdCommission) },
              { label: 'Pending Commission', value: formatCurrency(pendingCommission) },
              { label: 'Total Expenses', value: formatCurrency(totalExpenses) },
              { label: 'Net Income', value: formatCurrency(surplusDeficit) },
            ]},
            { category: 'Production', kpis: [
              { label: 'Active Policies', value: activePolicies },
              { label: 'Total Policies', value: totalPolicies },
              { label: 'Policies/Client', value: policiesPerClient },
              { label: 'Avg Premium', value: formatCurrency(avgPremium) },
            ]},
            { category: 'Retention', kpis: [
              { label: 'Retention Rate', value: formatPercent(retentionRate) },
              { label: 'Lapse Rate', value: formatPercent(lapsedRate) },
              { label: 'Cancel Rate', value: formatPercent(cancellationRate) },
              { label: 'Persistency', value: formatPercent(100 - lapsedRate) },
            ]},
            { category: 'Clients', kpis: [
              { label: 'Total Clients', value: totalClients },
              { label: 'Avg Client LTV', value: formatCurrency(avgClientValue) },
              { label: 'Client Lifetime Value', value: formatCurrency(clientLifetimeValue) },
              { label: 'New Clients MTD', value: clientMetrics?.newClientsThisMonth || 0 },
            ]},
          ].map((section, i) => (
            <div key={i} style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
              border: '1px solid #cbd5e0',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {section.category}
              </div>
              {section.kpis.map((kpi, j) => (
                <div key={j} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: j < section.kpis.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                  <span style={{ fontSize: '9px', color: '#656d76' }}>{kpi.label}</span>
                  <span style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'Monaco, monospace', color: '#1a1a1a' }}>{kpi.value}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </PageLayout>
  );
};
