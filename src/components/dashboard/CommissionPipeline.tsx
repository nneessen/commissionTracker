// src/components/dashboard/CommissionPipeline.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, Clock } from 'lucide-react';

interface CommissionPipelineProps {
  pending: number;
  paid: number;
  earned: number;
  unearned: number;
}

export const CommissionPipeline: React.FC<CommissionPipelineProps> = ({
  pending,
  paid,
  earned,
  unearned,
}) => {
  const total = pending + paid;
  const paidPercentage = total > 0 ? (paid / total) * 100 : 0;
  const pendingPercentage = total > 0 ? (pending / total) * 100 : 0;
  const earnedPercentage = paid > 0 ? (earned / paid) * 100 : 0;

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <Card className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground border-primary">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Commission Pipeline
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {/* Total Pipeline */}
        <div className="bg-primary-foreground/10 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm opacity-90">Total Pipeline</span>
            <span className="text-xl font-bold">{formatCurrency(total)}</span>
          </div>
          <div className="h-8 bg-primary-foreground/20 rounded-full overflow-hidden flex mb-3">
            <div
              className="h-full bg-status-active transition-all duration-300"
              style={{ width: `${paidPercentage}%` }}
              title={`Paid: ${formatCurrency(paid)}`}
            />
            <div
              className="h-full bg-status-pending transition-all duration-300"
              style={{ width: `${pendingPercentage}%` }}
              title={`Pending: ${formatCurrency(pending)}`}
            />
          </div>
          <div className="flex justify-between text-xs opacity-95">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5" />
              Paid: {formatCurrency(paid)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Pending: {formatCurrency(pending)}
            </span>
          </div>
        </div>

        {/* Earned vs Unearned */}
        <div className="bg-primary-foreground/10 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm opacity-90">Paid Commissions</span>
            <span className="text-xl font-bold">{formatCurrency(paid)}</span>
          </div>
          <div className="h-8 bg-primary-foreground/20 rounded-full overflow-hidden flex mb-3">
            <div
              className="h-full bg-status-earned transition-all duration-300"
              style={{ width: `${earnedPercentage}%` }}
              title={`Earned: ${formatCurrency(earned)}`}
            />
            <div
              className="h-full bg-destructive transition-all duration-300"
              style={{ width: `${100 - earnedPercentage}%` }}
              title={`Unearned (At Risk): ${formatCurrency(unearned)}`}
            />
          </div>
          <div className="flex justify-between text-xs opacity-95">
            <span className="flex items-center gap-1">
              ✓ Earned: {formatCurrency(earned)}
            </span>
            <span className="flex items-center gap-1">
              ⚠ At Risk: {formatCurrency(unearned)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
