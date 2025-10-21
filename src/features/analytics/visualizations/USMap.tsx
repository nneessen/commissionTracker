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
      <div className="p-10 text-center text-gray-400 text-xs">
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
    if (maxValue === minValue) return 'rgb(59, 130, 246)';

    const normalized = (value - minValue) / (maxValue - minValue);

    if (normalized >= 0.8) return 'rgb(16, 185, 129)';
    if (normalized >= 0.6) return 'rgb(59, 130, 246)';
    if (normalized >= 0.4) return 'rgb(245, 158, 11)';
    if (normalized >= 0.2) return 'rgb(251, 146, 60)';
    return 'rgb(239, 68, 68)';
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
      <div className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
        {title}
      </div>

      {/* Map SVG */}
      <svg
        width="100%"
        height="500"
        viewBox="0 0 1000 700"
        className="bg-muted rounded-lg"
      >
        {/* Render states as circles */}
        {Object.entries(statePositions).map(([state, [x, y]]) => {
          const stateData = valueMap.get(state);
          const hasData = stateData !== undefined;
          const value = stateData?.value || 0;
          const color = hasData ? getColor(value) : 'rgb(226, 232, 240)';
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
                stroke={hasData ? color : 'rgb(148, 163, 184)'}
                strokeWidth={hasData ? 2 : 1}
                className={hasData ? 'cursor-pointer' : 'cursor-default'}
              />

              {/* State abbreviation */}
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fontSize="10px"
                fontWeight="600"
                fill={hasData ? 'rgb(255, 255, 255)' : 'rgb(101, 109, 118)'}
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
      <div className="mt-5 flex gap-3 items-center text-xs text-muted-foreground">
        <span className="font-semibold">{valueLabel}:</span>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-error rounded-sm" />
          <span>Low</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-orange-400 rounded-sm" />
          <span>Below Avg</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-warning rounded-sm" />
          <span>Average</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-info rounded-sm" />
          <span>Above Avg</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-3 h-3 bg-success rounded-sm" />
          <span>High</span>
        </div>
        <div className="flex gap-2 items-center ml-auto">
          <div className="w-3 h-3 bg-gray-200 rounded-sm" />
          <span>No Data</span>
        </div>
      </div>

      {/* Top States List */}
      {data.length > 0 && (
        <div className="mt-5">
          <div className="text-xs font-semibold text-foreground mb-3 uppercase tracking-wide">
            Top States
          </div>
          <div className="grid gap-2">
            {[...data]
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)
              .map((state, idx) => (
                <div
                  key={state.state}
                  className={`flex justify-between items-center px-3 py-2 rounded-md text-xs ${idx === 0 ? 'bg-green-50' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-muted-foreground min-w-[20px]">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-foreground">
                      {state.state.toUpperCase()}
                    </span>
                    {state.label && (
                      <span className="text-gray-600">
                        {state.label}
                      </span>
                    )}
                  </div>
                  <span className={`font-semibold font-mono ${idx === 0 ? 'text-green-500' : 'text-gray-900'}`}>
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
