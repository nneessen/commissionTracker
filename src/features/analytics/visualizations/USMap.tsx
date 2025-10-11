// src/features/analytics/visualizations/USMap.tsx

import React from 'react';

export interface StateData {
  state: string; // Two-letter state code (e.g., 'CA', 'TX')
  value: number;
  label?: string;
}

interface USMapProps {
  data: StateData[];
  title?: string;
  valueLabel?: string;
}

/**
 * USMap - SVG US map with state-level data
 *
 * Displays a choropleth map of the United States with color-coded states
 * based on data values.
 */
export function USMap({
  data,
  title = 'Geographic Distribution',
  valueLabel = 'Value'
}: USMapProps) {
  // Simplified state positions (approximate)
  // Format: [x, y, abbreviation]
  const statePositions: { [key: string]: [number, number] } = {
    AL: [700, 450], AK: [100, 600], AZ: [250, 450], AR: [600, 400],
    CA: [150, 350], CO: [350, 300], CT: [850, 250], DE: [820, 320],
    FL: [750, 550], GA: [730, 470], HI: [300, 600], ID: [250, 200],
    IL: [650, 280], IN: [680, 300], IA: [600, 250], KS: [500, 350],
    KY: [700, 350], LA: [600, 500], ME: [880, 150], MD: [800, 320],
    MA: [870, 230], MI: [700, 220], MN: [550, 180], MS: [650, 470],
    MO: [600, 330], MT: [350, 150], NE: [480, 280], NV: [200, 300],
    NH: [870, 200], NJ: [830, 280], NM: [350, 430], NY: [820, 230],
    NC: [780, 400], ND: [480, 150], OH: [730, 290], OK: [520, 400],
    OR: [150, 180], PA: [790, 280], RI: [875, 245], SC: [760, 440],
    SD: [480, 210], TN: [680, 390], TX: [500, 500], UT: [280, 300],
    VT: [860, 190], VA: [780, 360], WA: [180, 120], WV: [760, 330],
    WI: [630, 200], WY: [350, 230]
  };

  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#94a3b8',
        fontSize: '12px'
      }}>
        No geographic data available
      </div>
    );
  }

  // Create value map
  const valueMap = new Map(data.map(d => [d.state.toUpperCase(), d]));

  // Calculate color scale
  const values = data.map(d => d.value);
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);

  const getColor = (value: number): string => {
    if (maxValue === minValue) return '#3b82f6';

    const normalized = (value - minValue) / (maxValue - minValue);

    if (normalized >= 0.8) return '#10b981';
    if (normalized >= 0.6) return '#3b82f6';
    if (normalized >= 0.4) return '#f59e0b';
    if (normalized >= 0.2) return '#fb923c';
    return '#ef4444';
  };

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value.toFixed(0)}`;
  };

  return (
    <div>
      {/* Title */}
      <div style={{
        fontSize: '13px',
        fontWeight: 600,
        color: '#1a1a1a',
        marginBottom: '16px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {title}
      </div>

      {/* Map SVG */}
      <svg
        width="100%"
        height="500"
        viewBox="0 0 1000 700"
        style={{ background: '#f8f9fa', borderRadius: '8px' }}
      >
        {/* Render states as circles */}
        {Object.entries(statePositions).map(([state, [x, y]]) => {
          const stateData = valueMap.get(state);
          const hasData = stateData !== undefined;
          const value = stateData?.value || 0;
          const color = hasData ? getColor(value) : '#e2e8f0';
          const opacity = hasData ? 0.8 : 0.3;

          return (
            <g key={state}>
              {/* State circle */}
              <circle
                cx={x}
                cy={y}
                r={hasData ? 20 : 15}
                fill={color}
                opacity={opacity}
                stroke={hasData ? color : '#94a3b8'}
                strokeWidth={hasData ? 2 : 1}
                style={{ cursor: hasData ? 'pointer' : 'default' }}
              />

              {/* State abbreviation */}
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize="10px"
                fontWeight="600"
                fill={hasData ? '#ffffff' : '#656d76'}
                pointerEvents="none"
              >
                {state}
              </text>

              {/* Tooltip */}
              {hasData && (
                <title>
                  {state}: {formatValue(value)}
                  {stateData.label ? ` (${stateData.label})` : ''}
                </title>
              )}
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{
        marginTop: '20px',
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        fontSize: '11px',
        color: '#656d76'
      }}>
        <span style={{ fontWeight: 600 }}>{valueLabel}:</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#ef4444', borderRadius: '2px' }} />
          <span>Low</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#fb923c', borderRadius: '2px' }} />
          <span>Below Avg</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#f59e0b', borderRadius: '2px' }} />
          <span>Average</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '2px' }} />
          <span>Above Avg</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ width: '12px', height: '12px', background: '#10b981', borderRadius: '2px' }} />
          <span>High</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: 'auto' }}>
          <div style={{ width: '12px', height: '12px', background: '#e2e8f0', borderRadius: '2px' }} />
          <span>No Data</span>
        </div>
      </div>

      {/* Top States List */}
      {data.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#1a1a1a',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Top States
          </div>
          <div style={{ display: 'grid', gap: '8px' }}>
            {[...data]
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
              .map((state, idx) => (
                <div
                  key={state.state}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: idx === 0 ? '#f0fdf4' : '#f8f9fa',
                    borderRadius: '6px',
                    fontSize: '11px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontWeight: 600,
                      color: '#656d76',
                      minWidth: '20px'
                    }}>
                      #{idx + 1}
                    </span>
                    <span style={{ fontWeight: 600, color: '#1a1a1a' }}>
                      {state.state.toUpperCase()}
                    </span>
                    {state.label && (
                      <span style={{ color: '#656d76' }}>
                        {state.label}
                      </span>
                    )}
                  </div>
                  <span style={{
                    fontWeight: 600,
                    color: idx === 0 ? '#10b981' : '#1a1a1a',
                    fontFamily: 'Monaco, monospace'
                  }}>
                    {formatValue(state.value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
