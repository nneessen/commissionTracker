// /home/nneessen/projects/commissionTracker/src/components/ui/MetricTooltip.tsx

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface MetricTooltipProps {
  title: string;
  description: string;
  formula?: string;
  example?: string;
  note?: string;
}

export const MetricTooltip: React.FC<MetricTooltipProps> = ({
  title,
  description,
  formula,
  example,
  note
}) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-block',
        marginLeft: '6px',
        verticalAlign: 'middle'
      }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <HelpCircle
        size={14}
        style={{
          color: '#94a3b8',
          cursor: 'help',
          transition: 'color 0.2s',
          ...(isVisible && { color: '#3b82f6' })
        }}
      />

      {isVisible && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            minWidth: '250px',
            maxWidth: '350px',
            zIndex: 1000,
            fontSize: '13px',
            lineHeight: '1.5',
            border: '1px solid rgba(255,255,255,0.1)'
          }}
        >
          {/* Arrow pointing down */}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #334155'
            }}
          />

          <div style={{ fontWeight: 600, marginBottom: '6px', color: '#3b82f6' }}>
            {title}
          </div>

          <div style={{ marginBottom: formula || example ? '6px' : 0 }}>
            {description}
          </div>

          {formula && (
            <div style={{
              background: 'rgba(0,0,0,0.3)',
              padding: '6px 8px',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '12px',
              marginBottom: example ? '6px' : 0
            }}>
              {formula}
            </div>
          )}

          {example && (
            <div style={{
              fontStyle: 'italic',
              fontSize: '12px',
              color: '#94a3b8',
              marginTop: '6px'
            }}>
              Example: {example}
            </div>
          )}

          {note && (
            <div style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              fontSize: '11px',
              color: '#fbbf24'
            }}>
              ⚠️ {note}
            </div>
          )}
        </div>
      )}
    </div>
  );
};