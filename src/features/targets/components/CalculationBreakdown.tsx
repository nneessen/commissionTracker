// src/features/targets/components/CalculationBreakdown.tsx

import React, { useState } from "react";
import { ChevronDown, ChevronUp, Calculator, Info } from "lucide-react";
import { formatCurrency } from "../../../lib/format";
import { CalculatedTargets } from "../../../services/targets/targetsCalculationService";

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
  // Use targets.annualExpenses which is the actual sum of expenses (not monthlyExpenseTarget * 12)
  const grossCommissionNeeded =
    targets.annualIncomeTarget + targets.annualExpenses;

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800">
      <div
        className="cursor-pointer px-3 py-2 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Calculation Breakdown
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {targets.calculationMethod === "historical"
              ? `Based on your data (${targets.dataPoints} data points)`
              : "Using default values"}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-3 space-y-4">
          {/* Data Source Alert */}
          {targets.calculationMethod === "default" && showWarnings && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                Using default values for calculations. As you add more policies
                and commissions, calculations will become more accurate based on
                your actual performance.
              </div>
            </div>
          )}

          {/* Income to Premium Calculation - NOW INCLUDES EXPENSES */}
          <div className="space-y-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Income → Premium Needed
            </h4>
            <div className="space-y-1 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  NET Income Target (after expenses):
                </span>
                <span className="text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(targets.annualIncomeTarget)}
                </span>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>+ Annual Business Expenses:</span>
                <span>{formatCurrency(targets.annualExpenses)}</span>
              </div>
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-1 flex justify-between font-semibold text-zinc-900 dark:text-zinc-100">
                <span>= GROSS Commission Needed:</span>
                <span>{formatCurrency(grossCommissionNeeded)}</span>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400 mt-2">
                <span>÷ Commission Rate:</span>
                <span>{commissionPercent}%</span>
              </div>
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-1 flex justify-between font-semibold text-zinc-900 dark:text-zinc-100">
                <span>= Premium Needed:</span>
                <span>{formatCurrency(targets.totalPremiumNeeded)}</span>
              </div>
            </div>
          </div>

          {/* Premium to Policies Calculation */}
          <div className="space-y-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Premium → Policies Needed
            </h4>
            <div className="space-y-1 text-sm font-mono">
              <div className="flex justify-between text-zinc-900 dark:text-zinc-100">
                <span>Premium Needed:</span>
                <span>{formatCurrency(targets.totalPremiumNeeded)}</span>
              </div>
              <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                <span>÷ Avg Policy Size:</span>
                <span>{formatCurrency(targets.avgPolicyPremium)}</span>
              </div>
              <div className="border-t border-zinc-200 dark:border-zinc-700 pt-1 flex justify-between font-semibold text-zinc-900 dark:text-zinc-100">
                <span>= Policies/Year:</span>
                <span>{targets.annualPoliciesTarget}</span>
              </div>
            </div>
          </div>

          {/* Time Period Breakdown */}
          <div className="space-y-3 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Time Period Breakdown
            </h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Quarterly
                </span>
                <span className="text-base font-semibold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                  {targets.quarterlyPoliciesTarget}{" "}
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                    policies
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Monthly
                </span>
                <span className="text-base font-semibold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                  {targets.monthlyPoliciesTarget}{" "}
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                    policies
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Weekly
                </span>
                <span className="text-base font-semibold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                  {targets.weeklyPoliciesTarget}{" "}
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                    policies
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white dark:bg-zinc-900 rounded border border-zinc-200 dark:border-zinc-700">
                <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                  Daily
                </span>
                <span className="text-base font-semibold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                  {targets.dailyPoliciesTarget}{" "}
                  <span className="text-sm text-zinc-500 dark:text-zinc-400 font-normal">
                    policies
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Key Metrics Used */}
          <div className="space-y-2 p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Key Metrics Used
            </h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Avg Commission Rate:
                </span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {commissionPercent}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Avg Policy Premium:
                </span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(targets.avgPolicyPremium)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Monthly Expenses:
                </span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(targets.monthlyExpenseTarget)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500 dark:text-zinc-400">
                  Expense Ratio:
                </span>
                <span className="font-mono text-zinc-900 dark:text-zinc-100">
                  {expenseRatioPercent}%
                </span>
              </div>
            </div>
          </div>

          {/* Confidence Indicator */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-500 dark:text-zinc-400">
              Calculation Confidence:
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {["high", "medium", "low"].map((level) => (
                  <div
                    key={level}
                    className={`h-2 w-6 rounded ${
                      (level === "high" && targets.confidence === "high") ||
                      (level === "medium" &&
                        ["high", "medium"].includes(targets.confidence)) ||
                      level === "low"
                        ? level === "high"
                          ? "bg-emerald-500"
                          : level === "medium"
                            ? "bg-amber-500"
                            : "bg-red-500"
                        : "bg-zinc-200 dark:bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
              <span className="capitalize text-xs font-medium text-zinc-900 dark:text-zinc-100">
                {targets.confidence}
              </span>
            </div>
          </div>

          {/* Note about adjustments */}
          <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
            These calculations automatically adjust as you add more policies and
            track commissions. The more data you have, the more accurate the
            projections become.
          </p>
        </div>
      )}
    </div>
  );
}
