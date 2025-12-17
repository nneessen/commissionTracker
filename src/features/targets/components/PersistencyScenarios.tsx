// src/features/targets/components/PersistencyScenarios.tsx

import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, AlertCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";

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
  avgCommissionRate: _avgCommissionRate,
  annualIncomeTarget: _annualIncomeTarget,
  monthlyExpenseTarget: _monthlyExpenseTarget,
}: PersistencyScenariosProps) {
  const [customPersistency, setCustomPersistency] = useState<string>("75");

  // Preset persistency rates
  const presetRates = [95, 90, 85, 80];

  const calculateScenario = (persistencyRate: number): PersistencyScenario => {
    // Convert persistency to decimal
    const persistencyDecimal = persistencyRate / 100;

    // Calculate how many policies we need to write to maintain the required active policies
    // If persistency is 80%, we need to write 1.25x policies to maintain the base
    const persistencyMultiplier = 1 / persistencyDecimal;

    // Calculate total policies needed accounting for churn
    const annualPoliciesNeeded = Math.ceil(
      baseAnnualPolicies * persistencyMultiplier,
    );

    // Calculate extra policies needed due to churn
    const extraPoliciesForChurn = annualPoliciesNeeded - baseAnnualPolicies;

    // Break down by time period
    const monthlyPoliciesNeeded = Math.ceil(annualPoliciesNeeded / 12);
    const weeklyPoliciesNeeded = Math.ceil(annualPoliciesNeeded / 52);
    const dailyPoliciesNeeded = Math.max(
      1,
      Math.ceil(annualPoliciesNeeded / 365),
    );

    // Calculate percentage increase from base
    const percentIncreaseFromBase =
      ((annualPoliciesNeeded - baseAnnualPolicies) / baseAnnualPolicies) * 100;

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
      grossPremiumNeeded,
    };
  };

  // Calculate scenarios for all preset rates plus custom
  const scenarios = useMemo(() => {
    const customRate = parseFloat(customPersistency);
    const allRates = [...presetRates];

    // Add custom rate if valid and not already in presets
    if (
      !isNaN(customRate) &&
      customRate > 0 &&
      customRate <= 100 &&
      !presetRates.includes(customRate)
    ) {
      allRates.push(customRate);
      allRates.sort((a, b) => b - a); // Sort descending
    }

    return allRates.map((rate) => calculateScenario(rate));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- calculateScenario uses props already in deps, presetRates is static
  }, [
    baseAnnualPolicies,
    totalPremiumNeeded,
    avgPolicyPremium,
    customPersistency,
  ]);

  // Get color based on persistency rate
  const getPersistencyColor = (rate: number) => {
    if (rate >= 95) return "text-emerald-600 dark:text-emerald-400";
    if (rate >= 90) return "text-blue-600 dark:text-blue-400";
    if (rate >= 85) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  // Get row highlighting based on whether it matches current persistency
  const getRowHighlight = (rate: number) => {
    const difference = Math.abs(rate - currentPersistency * 100);
    if (difference < 1) return "bg-blue-500/10"; // Highlight if within 1% of actual
    return "";
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            What-If Persistency Scenarios
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
            Current: {formatPercent(currentPersistency * 100)}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              Custom:
            </span>
            <Input
              type="number"
              value={customPersistency}
              onChange={(e) => setCustomPersistency(e.target.value)}
              className="w-14 h-6 text-[11px] px-1"
              min="1"
              max="100"
              step="5"
            />
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
              %
            </span>
          </div>
        </div>
      </div>

      <div className="p-3">
        {/* Explanation */}
        <div className="mb-3 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-3 w-3 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-[10px] leading-relaxed text-blue-700 dark:text-blue-300">
            <strong>How persistency affects your targets:</strong> Lower
            persistency means more policies cancel, requiring you to write extra
            policies to maintain income. At 80% persistency, 20% of policies
            cancel, so you need 25% more sales to compensate.
          </div>
        </div>

        {/* Scenarios Table */}
        <div className="rounded-md border border-zinc-200 dark:border-zinc-800">
          <Table>
            <TableHeader>
              <TableRow className="h-7 border-b border-zinc-200 dark:border-zinc-800">
                <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 w-20">
                  Persistency
                </TableHead>
                <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-center">
                  Annual Policies
                </TableHead>
                <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-center">
                  Monthly
                </TableHead>
                <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-center">
                  Weekly
                </TableHead>
                <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-center">
                  Daily
                </TableHead>
                <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-center">
                  Extra for Churn
                </TableHead>
                <TableHead className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/50 text-right">
                  Impact
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scenarios.map((scenario) => {
                const isCustom =
                  scenario.persistencyRate === parseFloat(customPersistency);
                const isCurrent =
                  Math.abs(
                    scenario.persistencyRate - currentPersistency * 100,
                  ) < 1;

                return (
                  <TableRow
                    key={scenario.persistencyRate}
                    className={cn(
                      "h-7 border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50",
                      getRowHighlight(scenario.persistencyRate),
                      isCustom && "ring-1 ring-blue-500 ring-inset",
                    )}
                  >
                    <TableCell className="text-[11px] font-medium p-2">
                      <div className="flex items-center gap-1">
                        <span
                          className={getPersistencyColor(
                            scenario.persistencyRate,
                          )}
                        >
                          {formatPercent(scenario.persistencyRate)}
                        </span>
                        {isCurrent && (
                          <span className="text-[9px] text-zinc-400 dark:text-zinc-500">
                            (current)
                          </span>
                        )}
                        {isCustom &&
                          !presetRates.includes(scenario.persistencyRate) && (
                            <span className="text-[9px] text-blue-600 dark:text-blue-400">
                              (custom)
                            </span>
                          )}
                      </div>
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2 font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {scenario.annualPoliciesNeeded}
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2 font-mono text-zinc-500 dark:text-zinc-400">
                      {scenario.monthlyPoliciesNeeded}
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2 font-mono text-zinc-500 dark:text-zinc-400">
                      {scenario.weeklyPoliciesNeeded}
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2 font-mono text-zinc-500 dark:text-zinc-400">
                      {scenario.dailyPoliciesNeeded}
                    </TableCell>

                    <TableCell className="text-[11px] text-center p-2">
                      {scenario.extraPoliciesForChurn > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-mono">
                          +{scenario.extraPoliciesForChurn}
                        </span>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          —
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-[11px] text-right p-2">
                      {scenario.percentIncreaseFromBase > 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          <TrendingUp className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            +{formatPercent(scenario.percentIncreaseFromBase)}
                          </span>
                        </div>
                      ) : scenario.percentIncreaseFromBase < 0 ? (
                        <div className="flex items-center justify-end gap-1">
                          <TrendingDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatPercent(scenario.percentIncreaseFromBase)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-400 dark:text-zinc-500">
                          —
                        </span>
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
          <div className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800">
            <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Best Case (95% Persistency)
            </div>
            <div className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              {scenarios.find((s) => s.persistencyRate === 95)
                ?.annualPoliciesNeeded || baseAnnualPolicies}{" "}
              policies/year
            </div>
            <div className="text-[9px] text-zinc-400 dark:text-zinc-500">
              Minimal churn, easiest to achieve targets
            </div>
          </div>

          <div className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800">
            <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              Worst Case (80% Persistency)
            </div>
            <div className="text-[11px] font-mono font-bold text-red-600 dark:text-red-400">
              {scenarios.find((s) => s.persistencyRate === 80)
                ?.annualPoliciesNeeded ||
                Math.ceil(baseAnnualPolicies * 1.25)}{" "}
              policies/year
            </div>
            <div className="text-[9px] text-zinc-400 dark:text-zinc-500">
              High churn, requires {formatPercent(25)} more sales effort
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
