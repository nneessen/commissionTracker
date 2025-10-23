// src/features/analytics/components/SegmentCard.tsx

import React from 'react';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '../../../lib/format';
import { cn } from '@/lib/utils';

export type SegmentTier = 'high' | 'medium' | 'low';

interface SegmentCardProps {
  tier: SegmentTier;
  clientCount: number;
  totalValue: number;
  avgValue: number;
  percentage: number;
}

const getSegmentClasses = (tier: SegmentTier) => {
  if (tier === 'high') return {
    bg: 'bg-gradient-to-br from-success/20 via-status-active/10 to-card',
    text: 'text-success'
  };
  if (tier === 'medium') return {
    bg: 'bg-gradient-to-br from-info/20 via-status-earned/10 to-card',
    text: 'text-info'
  };
  return {
    bg: 'bg-gradient-to-br from-warning/20 via-status-pending/10 to-card',
    text: 'text-warning'
  };
};

/**
 * Card displaying a client value segment (High/Medium/Low)
 */
export function SegmentCard({ tier, clientCount, totalValue, avgValue, percentage }: SegmentCardProps) {
  const classes = getSegmentClasses(tier);

  return (
    <Card className={cn("p-4 shadow-md hover:shadow-lg transition-all duration-200", classes.bg)}>
      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {tier.toUpperCase()} VALUE
      </div>
      <div className={cn("text-xl font-bold font-mono mb-2", classes.text)}>
        {clientCount}
      </div>
      <div className={cn("text-sm font-semibold mb-1", classes.text)}>
        {formatCurrency(totalValue)}
      </div>
      <div className="text-[10px] text-muted-foreground">
        Avg: {formatCurrency(avgValue)} · {percentage.toFixed(0)}% of revenue
      </div>
    </Card>
  );
}
