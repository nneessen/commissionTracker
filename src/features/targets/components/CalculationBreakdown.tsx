// src/features/targets/components/CalculationBreakdown.tsx

import React, { useState } from 'react';
import {ChevronDown, ChevronUp, Calculator, Info} from 'lucide-react';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';
import {Alert, AlertDescription} from '@/components/ui/alert';
import {formatCurrency} from '../../../lib/format';
import {CalculatedTargets} from '../../../services/targets/targetsCalculationService';

interface CalculationBreakdownProps {
  targets: CalculatedTargets;
  showWarnings?: boolean;
}

export function CalculationBreakdown({
  targets,
  showWarnings = true,
}: CalculationBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const commissionPercent = (targets.avgCommissionRate * 100).toFixed(1);
  const expenseRatioPercent = (targets.expenseRatio * 100).toFixed(1);

  // Calculate gross commission needed (income + expenses)
  const annualExpenses = targets.monthlyExpenseTarget * 12;
  const grossCommissionNeeded = targets.annualIncomeTarget + annualExpenses;

  return (
    <Card>
      <CardHeader
        className="cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Calculation Breakdown
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {targets.calculationMethod === 'historical'
                ? `Based on your data (${targets.dataPoints} data points)`
                : 'Using default values'}
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Data Source Alert */}
          {targets.calculationMethod === 'default' && showWarnings && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Using default values for calculations. As you add more policies and commissions,
                calculations will become more accurate based on your actual performance.
              </AlertDescription>
            </Alert>
          )}

          {/* Income to Premium Calculation - NOW INCLUDES EXPENSES */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-semibold">Income → Premium Needed</h4>
            <div className="space-y-1 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-muted-foreground">NET Income Target (after expenses):</span>
                <span>{formatCurrency(targets.annualIncomeTarget)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>+ Annual Business Expenses:</span>
                <span>{formatCurrency(annualExpenses)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between font-semibold">
                <span>= GROSS Commission Needed:</span>
                <span>{formatCurrency(grossCommissionNeeded)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground mt-2">
                <span>÷ Commission Rate:</span>
                <span>{commissionPercent}%</span>
              </div>
              <div className="border-t pt-1 flex justify-between font-semibold">
                <span>= Premium Needed:</span>
                <span>{formatCurrency(targets.totalPremiumNeeded)}</span>
              </div>
            </div>
          </div>

          {/* Premium to Policies Calculation */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-semibold">Premium → Policies Needed</h4>
            <div className="space-y-1 text-sm font-mono">
              <div className="flex justify-between">
                <span>Premium Needed:</span>
                <span>{formatCurrency(targets.totalPremiumNeeded)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>÷ Avg Policy Size:</span>
                <span>{formatCurrency(targets.avgPolicyPremium)}</span>
              </div>
              <div className="border-t pt-1 flex justify-between font-semibold">
                <span>= Policies/Year:</span>
                <span>{targets.annualPoliciesTarget}</span>
              </div>
            </div>
          </div>

          {/* Time Period Breakdown */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-semibold mb-2">Time Period Breakdown</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50">
                <span className="text-sm font-medium text-muted-foreground">Quarterly</span>
                <span className="text-base font-semibold font-mono tabular-nums">
                  {targets.quarterlyPoliciesTarget} <span className="text-sm text-muted-foreground font-normal">policies</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50">
                <span className="text-sm font-medium text-muted-foreground">Monthly</span>
                <span className="text-base font-semibold font-mono tabular-nums">
                  {targets.monthlyPoliciesTarget} <span className="text-sm text-muted-foreground font-normal">policies</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50">
                <span className="text-sm font-medium text-muted-foreground">Weekly</span>
                <span className="text-base font-semibold font-mono tabular-nums">
                  {targets.weeklyPoliciesTarget} <span className="text-sm text-muted-foreground font-normal">policies</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-background/50 rounded border border-border/50">
                <span className="text-sm font-medium text-muted-foreground">Daily</span>
                <span className="text-base font-semibold font-mono tabular-nums">
                  {targets.dailyPoliciesTarget} <span className="text-sm text-muted-foreground font-normal">policies</span>
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics Used */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <h4 className="text-sm font-semibold">Key Metrics Used</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Commission Rate:</span>
                <span className="font-mono">{commissionPercent}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Avg Policy Premium:</span>
                <span className="font-mono">{formatCurrency(targets.avgPolicyPremium)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Monthly Expenses:</span>
                <span className="font-mono">{formatCurrency(targets.monthlyExpenseTarget)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expense Ratio:</span>
                <span className="font-mono">{expenseRatioPercent}%</span>
              </div>
            </div>
          </div>

          {/* Confidence Indicator */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Calculation Confidence:</span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {['high', 'medium', 'low'].map((level) => (
                  <div
                    key={level}
                    className={`h-2 w-6 rounded ${
                      (level === 'high' && targets.confidence === 'high') ||
                      (level === 'medium' && ['high', 'medium'].includes(targets.confidence)) ||
                      (level === 'low')
                        ? level === 'high'
                          ? 'bg-green-500'
                          : level === 'medium'
                          ? 'bg-yellow-500'
                          : 'bg-orange-500'
                        : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="capitalize text-xs font-medium">
                {targets.confidence}
              </span>
            </div>
          </div>

          {/* Note about adjustments */}
          <p className="text-xs text-muted-foreground italic">
            These calculations automatically adjust as you add more policies and track commissions.
            The more data you have, the more accurate the projections become.
          </p>
        </CardContent>
      )}
    </Card>
  );
}