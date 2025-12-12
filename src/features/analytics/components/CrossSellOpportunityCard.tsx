// src/features/analytics/components/CrossSellOpportunityCard.tsx

import React from 'react';
import {Card, CardContent} from '@/components/ui/card';
import {formatCurrency} from '../../../lib/format';
import {cn} from '@/lib/utils';

export interface CrossSellOpportunity {
  clientName: string;
  currentPolicies: number;
  estimatedValue: number;
  opportunityScore: number;
}

interface CrossSellOpportunityCardProps {
  opportunity: CrossSellOpportunity;
  isTopRanked?: boolean;
}

/**
 * Card displaying a cross-sell opportunity for a client
 */
export function CrossSellOpportunityCard({ opportunity, isTopRanked }: CrossSellOpportunityCardProps) {
  return (
    <Card
      className={cn(
        "shadow-md hover:shadow-lg transition-all duration-200",
        isTopRanked
          ? 'bg-gradient-to-r from-success/25 via-status-active/15 to-card'
          : 'bg-gradient-to-r from-info/15 via-status-earned/10 to-card'
      )}
    >
      <CardContent className="flex justify-between items-center p-3">
        <div>
          <div className="text-xs font-semibold text-foreground mb-1">
            {opportunity.clientName}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {opportunity.currentPolicies} policies · <span className="text-success font-semibold">{formatCurrency(opportunity.estimatedValue)}</span> potential
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "text-sm font-bold font-mono",
              isTopRanked ? 'text-success' : 'text-info'
            )}
          >
            {opportunity.opportunityScore}
          </div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">
            Score
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
