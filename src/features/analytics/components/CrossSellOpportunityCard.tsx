// src/features/analytics/components/CrossSellOpportunityCard.tsx

import React from 'react';
import { formatCurrency } from '../../../lib/format';

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
    <div
      className={`flex justify-between items-center p-3 rounded-md ${
        isTopRanked ? 'bg-green-50' : 'bg-gray-50'
      }`}
    >
      <div>
        <div className="text-xs font-semibold text-foreground mb-1">
          {opportunity.clientName}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {opportunity.currentPolicies} policies · {formatCurrency(opportunity.estimatedValue)} potential
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div
          className={`text-sm font-bold font-mono ${
            isTopRanked ? 'text-green-500' : 'text-blue-500'
          }`}
        >
          {opportunity.opportunityScore}
        </div>
        <div className="text-[10px] font-semibold text-muted-foreground uppercase">
          Score
        </div>
      </div>
    </div>
  );
}
