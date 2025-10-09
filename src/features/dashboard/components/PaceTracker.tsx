import React from 'react';
import { Target, Calendar, TrendingUp } from 'lucide-react';

interface PaceTrackerProps {
  policiesNeededPerWeek: number;
  policiesNeededPerMonth: number;
  daysRemainingInQuarter: number;
  daysRemainingInYear: number;
  currentRunRate: number;
  targetRunRate: number;
  averageAP: number;
}

export const PaceTracker: React.FC<PaceTrackerProps> = ({
  policiesNeededPerWeek,
  policiesNeededPerMonth,
  daysRemainingInQuarter,
  daysRemainingInYear,
  currentRunRate,
  targetRunRate,
  averageAP,
}) => {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const runRatePercentage = targetRunRate > 0
    ? Math.min(100, (currentRunRate / targetRunRate) * 100)
    : 0;

  const onPace = currentRunRate >= targetRunRate;

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
          <Target size={24} color="#f8f9fa" />
        </div>
        <div>
          <h3 style={{ fontSize: '20px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
            Pace Tracker
          </h3>
          <p style={{ fontSize: '14px', color: '#4a5568', margin: 0 }}>
            Goal tracking based on real average AP
          </p>
        </div>
      </div>

      {/* Pace Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '20px',
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
            Policies/Week Needed
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {policiesNeededPerWeek}
          </div>
          <div style={{ fontSize: '11px', color: '#656d76', marginTop: '4px' }}>
            To hit annual target
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
            Policies/Month Needed
          </div>
          <div style={{ fontSize: '32px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {policiesNeededPerMonth}
          </div>
          <div style={{ fontSize: '11px', color: '#656d76', marginTop: '4px' }}>
            Average monthly goal
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
            Average AP
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', fontFamily: 'Monaco, Menlo, monospace' }}>
            {formatCurrency(averageAP)}
          </div>
          <div style={{ fontSize: '11px', color: '#656d76', marginTop: '4px' }}>
            From real policy data
          </div>
        </div>
      </div>

      {/* Days Remaining */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
            boxShadow: '0 1px 4px rgba(26, 26, 26, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Calendar size={16} color="#1a1a1a" />
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>
              {daysRemainingInQuarter}
            </div>
            <div style={{ fontSize: '10px', color: '#656d76', textTransform: 'uppercase' }}>
              Days left (Quarter)
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '12px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e2e8f0 100%)',
            boxShadow: '0 1px 4px rgba(26, 26, 26, 0.05)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <Calendar size={16} color="#1a1a1a" />
          <div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>
              {daysRemainingInYear}
            </div>
            <div style={{ fontSize: '10px', color: '#656d76', textTransform: 'uppercase' }}>
              Days left (Year)
            </div>
          </div>
        </div>
      </div>

      {/* Run Rate Progress */}
      <div
        style={{
          padding: '16px',
          borderRadius: '12px',
          background: onPace
            ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
            : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          boxShadow: '0 2px 8px rgba(26, 26, 26, 0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={16} color={onPace ? '#15803d' : '#991b1b'} />
            <span style={{ fontSize: '13px', color: '#1a1a1a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Current Run Rate
            </span>
          </div>
          <span style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 700 }}>
            {runRatePercentage.toFixed(0)}%
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
            marginBottom: '12px',
          }}
        >
          <div
            style={{
              width: `${runRatePercentage}%`,
              height: '100%',
              background: onPace
                ? 'linear-gradient(90deg, #15803d 0%, #16a34a 100%)'
                : 'linear-gradient(90deg, #dc2626 0%, #ef4444 100%)',
              borderRadius: '6px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {/* Run Rate Stats */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
          <div>
            <span style={{ color: '#656d76' }}>Current: </span>
            <span style={{ color: '#1a1a1a', fontWeight: 700, fontFamily: 'Monaco, Menlo, monospace' }}>
              {formatCurrency(currentRunRate)}
            </span>
          </div>
          <div>
            <span style={{ color: '#656d76' }}>Target: </span>
            <span style={{ color: '#1a1a1a', fontWeight: 700, fontFamily: 'Monaco, Menlo, monospace' }}>
              {formatCurrency(targetRunRate)}
            </span>
          </div>
        </div>

        {!onPace && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(153, 27, 27, 0.1)',
              border: '1px solid #dc2626',
              fontSize: '12px',
              color: '#991b1b',
              fontWeight: 500,
            }}
          >
            📉 You're behind pace. Need to increase production to hit target.
          </div>
        )}

        {onPace && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '6px',
              background: 'rgba(21, 128, 61, 0.1)',
              border: '1px solid #16a34a',
              fontSize: '12px',
              color: '#15803d',
              fontWeight: 500,
            }}
          >
            ✓ You're on pace to exceed your annual target!
          </div>
        )}
      </div>
    </div>
  );
};
