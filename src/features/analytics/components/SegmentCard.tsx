// src/features/analytics/components/SegmentCard.tsx

import React from 'react';
import { formatCurrency } from '../../../lib/format';

export type SegmentTier = 'high' | 'medium' | 'low';

interface SegmentCardProps {
  tier: SegmentTier;
  clientCount: number;
  totalValue: number;
  avgValue: number;
  percentage: number;
}

const getSegmentClasses = (tier: SegmentTier) => {
  if (tier === 'high') return { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-500' };
  if (tier === 'medium') return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-500' };
  return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-500' };
};

/**
 * Card displaying a client value segment (High/Medium/Low)
 */
export function SegmentCard({ tier, clientCount, totalValue, avgValue, percentage }: SegmentCardProps) {
  const classes = getSegmentClasses(tier);

  return (
    <div className={`p-4 rounded-lg border ${classes.bg} ${classes.border}`}>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {tier.toUpperCase()} VALUE
      </div>
      <div className={`text-xl font-bold font-mono mb-2 ${classes.text}`}>
        {clientCount}
      </div>
      <div className={`text-sm font-semibold mb-1 ${classes.text}`}>
        {formatCurrency(totalValue)}
      </div>
      <div className="text-[10px] text-muted-foreground">
        Avg: {formatCurrency(avgValue)} · {percentage.toFixed(0)}% of revenue
      </div>
    </div>
  );
}
