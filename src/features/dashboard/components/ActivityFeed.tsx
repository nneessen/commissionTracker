import React from 'react';
import { Clock, FileText, DollarSign } from 'lucide-react';

interface RecentPolicy {
  id: string;
  policyNumber: string;
  clientName: string;
  annualPremium: number;
  product: string;
  createdAt: Date;
}

interface RecentCommission {
  id: string;
  amount: number;
  product: string;
  status: string;
  paidDate?: Date;
  createdAt: Date;
}

interface ActivityFeedProps {
  recentPolicies: RecentPolicy[];
  recentCommissions: RecentCommission[];
}

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  recentPolicies,
  recentCommissions,
}) => {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatProductName = (product: string) => {
    return product
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const hasActivity = (recentPolicies && recentPolicies.length > 0) || (recentCommissions && recentCommissions.length > 0);

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 4px 20px rgba(26, 26, 26, 0.08)',
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
          <Clock size={24} color="#f8f9fa" />
        </div>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            Recent Activity
          </h3>
          <p style={{ fontSize: '14px', color: '#4a5568', margin: 0 }}>
            Latest policies and commissions
          </p>
        </div>
      </div>

      {!hasActivity ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '16px', color: '#4a5568', marginBottom: '8px', fontWeight: 500 }}>
            No recent activity
          </div>
          <div style={{ fontSize: '13px', color: '#9ca3af' }}>
            Start adding policies to see your activity here
          </div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}
        >
          {/* Recent Policies */}
          {recentPolicies && recentPolicies.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <FileText size={16} color="#1a1a1a" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Recent Policies
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentPolicies.slice(0, 5).map((policy) => (
                  <div
                    key={policy.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
                      boxShadow: '0 1px 3px rgba(26, 26, 26, 0.05)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(26, 26, 26, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(26, 26, 26, 0.05)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginBottom: '2px' }}>
                          {policy.clientName}
                        </div>
                        <div style={{ fontSize: '11px', color: '#656d76' }}>
                          {policy.policyNumber}
                        </div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
                        {formatCurrency(policy.annualPremium)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div
                        style={{
                          fontSize: '10px',
                          color: '#4a5568',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#ffffff',
                        }}
                      >
                        {formatProductName(policy.product)}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                        {formatDate(policy.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Commissions */}
          {recentCommissions && recentCommissions.length > 0 && (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <DollarSign size={16} color="#1a1a1a" />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Recent Commissions
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {recentCommissions.slice(0, 5).map((commission) => (
                  <div
                    key={commission.id}
                    style={{
                      padding: '12px',
                      borderRadius: '8px',
                      background: commission.status === 'paid'
                        ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
                        : 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                      boxShadow: '0 1px 3px rgba(26, 26, 26, 0.05)',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 8px rgba(26, 26, 26, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(26, 26, 26, 0.05)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
                          {formatCurrency(commission.amount)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#656d76' }}>
                          {formatProductName(commission.product)}
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: '10px',
                          color: commission.status === 'paid' ? '#15803d' : '#1e40af',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: commission.status === 'paid' ? '#dcfce7' : '#dbeafe',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                        }}
                      >
                        {commission.status}
                      </div>
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                      {commission.paidDate ? formatDate(commission.paidDate) : formatDate(commission.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
