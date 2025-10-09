import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertCircle } from 'lucide-react';

interface FinancialHealthCardProps {
  monthlyExpenses: number;
  totalEarned: number;
  totalPending: number;
  breakevenCommission: number;
  surplusDeficit: number;
}

export const FinancialHealthCard: React.FC<FinancialHealthCardProps> = ({
  monthlyExpenses,
  totalEarned,
  totalPending,
  breakevenCommission,
  surplusDeficit,
}) => {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const isSurplus = surplusDeficit >= 0;
  const healthPercentage = breakevenCommission > 0
    ? Math.min(100, (totalEarned / breakevenCommission) * 100)
    : 0;

  return (
    <div
      className="financial-health-card"
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
          <DollarSign size={24} color="#f8f9fa" />
        </div>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            Financial Health
          </h3>
          <p style={{ fontSize: '14px', color: '#4a5568', margin: 0 }}>
            Breakeven tracking & income analysis
          </p>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        {/* Monthly Expenses */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
            boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Monthly Expenses
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {formatCurrency(monthlyExpenses)}
          </div>
          <div style={{ fontSize: '11px', color: '#656d76', marginTop: '4px' }}>
            Break even target
          </div>
        </div>

        {/* YTD Earned */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: isSurplus
              ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
              : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            YTD Commission
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {formatCurrency(totalEarned)}
          </div>
          <div
            style={{
              fontSize: '11px',
              color: isSurplus ? '#15803d' : '#991b1b',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isSurplus ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {isSurplus ? `+${formatCurrency(surplusDeficit)} surplus` : `${formatCurrency(Math.abs(surplusDeficit))} deficit`}
          </div>
        </div>

        {/* Pipeline */}
        <div
          style={{
            padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
            boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#4a5568', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            Pipeline Value
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {formatCurrency(totalPending)}
          </div>
          <div style={{ fontSize: '11px', color: '#656d76', marginTop: '4px' }}>
            Pending commissions
          </div>
        </div>
      </div>

      {/* Health Progress Bar */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
          boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: '#2d3748', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Breakeven Progress
          </span>
          <span style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 700 }}>
            {healthPercentage.toFixed(0)}%
          </span>
        </div>

        {/* Progress Bar */}
        <div
          style={{
            width: '100%',
            height: '12px',
            background: '#e2e8f0',
            borderRadius: '6px',
            overflow: 'hidden',
            boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div
            style={{
              width: `${healthPercentage}%`,
              height: '100%',
              background: healthPercentage >= 100
                ? 'linear-gradient(90deg, #15803d 0%, #16a34a 100%)'
                : 'linear-gradient(90deg, #1a1a1a 0%, #2d3748 100%)',
              borderRadius: '6px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        <div style={{ fontSize: '11px', color: '#656d76', marginTop: '8px' }}>
          {healthPercentage >= 100
            ? '✓ You have exceeded your breakeven target'
            : `${formatCurrency(breakevenCommission - totalEarned)} needed to break even`}
        </div>
      </div>

      {/* Alert if needed */}
      {healthPercentage < 50 && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: '1px solid #f59e0b',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.15)',
          }}
        >
          <AlertCircle size={20} color="#92400e" />
          <span style={{ fontSize: '13px', color: '#92400e', fontWeight: 500 }}>
            You're below 50% of your breakeven target. Focus on production!
          </span>
        </div>
      )}
    </div>
  );
};
