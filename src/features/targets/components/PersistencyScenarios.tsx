// src/features/targets/components/PersistencyScenarios.tsx

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, AlertCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '../../../lib/format';

interface PersistencyScenario {
  persistencyRate: number;
  annualPoliciesNeeded: number;
  monthlyPoliciesNeeded: number;
  weeklyPoliciesNeeded: number;
  dailyPoliciesNeeded: number;
  extraPoliciesForChurn: number;
  percentIncreaseFromBase: number;
  grossPremiumNeeded: number;
}

interface PersistencyScenariosProps {
  baseAnnualPolicies: number;
  totalPremiumNeeded: number;
  avgPolicyPremium: number;
  currentPersistency: number; // Actual persistency rate for comparison
  avgCommissionRate: number;
  annualIncomeTarget: number;
  monthlyExpenseTarget: number;
}

export function PersistencyScenarios({
  baseAnnualPolicies,
  totalPremiumNeeded,
  avgPolicyPremium,
  currentPersistency,
  avgCommissionRate,
  annualIncomeTarget,
  monthlyExpenseTarget
}: PersistencyScenariosProps) {
  const [customPersistency, setCustomPersistency] = useState<string>('75');

  // Preset persistency rates
  const presetRates = [95, 90, 85, 80];

  const calculateScenario = (persistencyRate: number): PersistencyScenario => {
    // Convert persistency to decimal
    const persistencyDecimal = persistencyRate / 100;

    // Calculate how many policies we need to write to maintain the required active policies
    // If persistency is 80%, we need to write 1.25x policies to maintain the base
    const persistencyMultiplier = 1 / persistencyDecimal;

    // Calculate total policies needed accounting for churn
    const annualPoliciesNeeded = Math.ceil(baseAnnualPolicies * persistencyMultiplier);

    // Calculate extra policies needed due to churn
    const extraPoliciesForChurn = annualPoliciesNeeded - baseAnnualPolicies;

    // Break down by time period
    const monthlyPoliciesNeeded = Math.ceil(annualPoliciesNeeded / 12);
    const weeklyPoliciesNeeded = Math.ceil(annualPoliciesNeeded / 52);
    const dailyPoliciesNeeded = Math.max(1, Math.ceil(annualPoliciesNeeded / 365));

    // Calculate percentage increase from base
    const percentIncreaseFromBase = ((annualPoliciesNeeded - baseAnnualPolicies) / baseAnnualPolicies) * 100;

    // Calculate gross premium needed at this persistency rate
    // More policies = more total premium collected
    const grossPremiumNeeded = annualPoliciesNeeded * avgPolicyPremium;

    return {
      persistencyRate,
      annualPoliciesNeeded,
      monthlyPoliciesNeeded,
      weeklyPoliciesNeeded,
      dailyPoliciesNeeded,
      extraPoliciesForChurn,
      percentIncreaseFromBase,
      grossPremiumNeeded
    };
  };

  // Calculate scenarios for all preset rates plus custom
  const scenarios = useMemo(() => {
    const customRate = parseFloat(customPersistency);
    const allRates = [...presetRates];

    // Add custom rate if valid and not already in presets
    if (!isNaN(customRate) && customRate > 0 && customRate <= 100 && !presetRates.includes(customRate)) {
      allRates.push(customRate);
      allRates.sort((a, b) => b - a); // Sort descending
    }

    return allRates.map(rate => calculateScenario(rate));
  }, [baseAnnualPolicies, totalPremiumNeeded, avgPolicyPremium, customPersistency]);

  // Get color based on persistency rate
  const getPersistencyColor = (rate: number) => {
    if (rate >= 95) return 'text-success';
    if (rate >= 90) return 'text-info';
    if (rate >= 85) return 'text-warning';
    return 'text-error';
  };

  // Get row highlighting based on whether it matches current persistency
  const getRowHighlight = (rate: number) => {
    const difference = Math.abs(rate - (currentPersistency * 100));
    if (difference < 1) return 'bg-accent/50'; // Highlight if within 1% of actual
    return '';
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <Card>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-muted-foreground" />
            What-If Persistency Scenarios
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Current: {formatPercent(currentPersistency * 100)}</span>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Custom:</span>
              <Input
                type="number"
                value={customPersistency}
                onChange={(e) => setCustomPersistency(e.target.value)}
                className="w-14 h-6 text-[11px] px-1"
                min="1"
                max="100"
                step="5"
              />
              <span className="text-[10px] text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 pt-2">
        {/* Explanation */}
        <Alert className="mb-3 p-2">
          <AlertCircle className="h-3 w-3" />
          <AlertDescription className="text-[10px] leading-relaxed">
            <strong>How persistency affects your targets:</strong> Lower persistency means more policies cancel,
            requiring you to write extra policies to maintain income. At 80% persistency,
            20% of policies cancel, so you need 25% more sales to compensate.
          </AlertDescription>
        </Alert>

        {/* Scenarios Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="h-7">
                <TableHead className="text-[10px] font-medium w-20">Persistency</TableHead>
                <TableHead className="text-[10px] font-medium text-center">Annual Policies</TableHead>
                <TableHead className="text-[10px] font-medium text-center">Monthly</TableHead>
                <TableHead className="text-[10px] font-medium text-center">Weekly</TableHead>
                <TableHead className="text-[10px] font-medium text-center">Daily</TableHead>
                <TableHead className="text-[10px] font-medium text-center">Extra for Churn</TableHead>
                <TableHead className="text-[10px] font-medium text-right">Impact</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((scenario) => {
                const isCustom = scenario.persistencyRate === parseFloat(customPersistency);
                const isCurrent = Math.abs(scenario.persistencyRate - (currentPersistency * 100)) < 1;

                return (
                  <TableRow
                    key={scenario.persistencyRate}
                    className={cn(
                      "h-7",
                      getRowHighlight(scenario.persistencyRate),
                      isCustom && "ring-1 ring-primary ring-inset"
                    )}
                  >
                    <TableCell className="text-[11px] font-medium p-2">
                      <div className="flex items-center gap-1">
                        <span className={getPersistencyColor(scenario.persistencyRate)}>
                          {formatPercent(scenario.persistencyRate)}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] text-muted-foreground">(current)</span>
                        )}
                        {isCustom && !presetRates.includes(scenario.persistencyRate) && (
                          <span className="text-[9px] text-primary">(custom)</span>
                        )}
                      </div>
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2 font-mono font-semibold">
                      {scenario.annualPoliciesNeeded}
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2 font-mono">
                      {scenario.monthlyPoliciesNeeded}
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2 font-mono">
                      {scenario.weeklyPoliciesNeeded}
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2 font-mono">
                      {scenario.dailyPoliciesNeeded}
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2">
                      {scenario.extraPoliciesForChurn > 0 ? (
                        <span className="text-warning font-mono">
                          +{scenario.extraPoliciesForChurn}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell className="text-[11px] text-right p-2">
                      {scenario.percentIncreaseFromBase > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3 text-warning" />
                          <span className="text-warning font-semibold">
                            +{formatPercent(scenario.percentIncreaseFromBase)}
                          </span>
                        </div>
                      ) : scenario.percentIncreaseFromBase < 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          <TrendingDown className="h-3 w-3 text-success" />
                          <span className="text-success font-semibold">
                            {formatPercent(scenario.percentIncreaseFromBase)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Key Insights */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="p-2 rounded-md bg-muted/50">
            <div className="text-[10px] font-medium text-muted-foreground mb-1">Best Case (95% Persistency)</div>
            <div className="text-[11px] font-mono font-bold text-success">
              {scenarios.find(s => s.persistencyRate === 95)?.annualPoliciesNeeded || baseAnnualPolicies} policies/year
            </div>
            <div className="text-[9px] text-muted-foreground">
              Minimal churn, easiest to achieve targets
            </div>
          </div>

          <div className="p-2 rounded-md bg-muted/50">
            <div className="text-[10px] font-medium text-muted-foreground mb-1">Worst Case (80% Persistency)</div>
            <div className="text-[11px] font-mono font-bold text-error">
              {scenarios.find(s => s.persistencyRate === 80)?.annualPoliciesNeeded || Math.ceil(baseAnnualPolicies * 1.25)} policies/year
            </div>
            <div className="text-[9px] text-muted-foreground">
              High churn, requires {formatPercent(25)} more sales effort
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}