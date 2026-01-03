// src/features/targets/TargetsPage.tsx

import { useState, useEffect } from "react";
import {
  useTargets,
  useUpdateTargets,
  useActualMetrics,
} from "../../hooks/targets";
import { useHistoricalAverages } from "../../hooks/targets/useHistoricalAverages";
import { useUserCommissionProfile } from "../../hooks/commissions/useUserCommissionProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit2, Target, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "../../lib/format";
import { toast } from "sonner";
import {
  targetsCalculationService,
  CalculatedTargets,
} from "../../services/targets/targetsCalculationService";
import { TargetInputDialog } from "./components/TargetInputDialog";
import { PersistencyScenarios } from "./components/PersistencyScenarios";

export function TargetsPage() {
  const { data: targets, isLoading, error } = useTargets();
  const actualMetrics = useActualMetrics();
  const updateTargets = useUpdateTargets();
  const { averages, isLoading: averagesLoading } = useHistoricalAverages();
  const { data: commissionProfile } = useUserCommissionProfile();

  const [showInputDialog, setShowInputDialog] = useState(false);
  const [calculatedTargets, setCalculatedTargets] =
    useState<CalculatedTargets | null>(null);
  const [annualTarget, setAnnualTarget] = useState<number>(0);
  const [isEditingInline, setIsEditingInline] = useState(false);
  const [inlineEditValue, setInlineEditValue] = useState<string>("");

  // Check if this is the first visit (no target set)
  const isFirstTime = targets && targets.annualIncomeTarget === 0;

  // Calculate targets whenever annual target or averages change
  // CRITICAL: Force recalculation when averages object changes (including avgPolicyPremium)
  useEffect(() => {
    if (targets && targets.annualIncomeTarget > 0 && !averagesLoading) {
      const calculated = targetsCalculationService.calculateTargets({
        annualIncomeTarget: targets.annualIncomeTarget,
        historicalAverages: averages,
        // Never use overrides - always use fresh calculated averages
        overrides: undefined,
      });
      setCalculatedTargets(calculated);
      setAnnualTarget(targets.annualIncomeTarget);
    }
  }, [targets, averages, averagesLoading, averages.avgPolicyPremium]);

  // Show welcome dialog on first visit
  useEffect(() => {
    if (isFirstTime && !isLoading) {
      setShowInputDialog(true);
    }
  }, [isFirstTime, isLoading]);

  const handleSaveTarget = async (newAnnualTarget: number) => {
    try {
      // Calculate all derived values
      const calculated = targetsCalculationService.calculateTargets({
        annualIncomeTarget: newAnnualTarget,
        historicalAverages: averages,
      });

      // Save to database
      // NOTE: avgPremiumTarget removed - always calculated from actual policies
      await updateTargets.mutateAsync({
        annualIncomeTarget: newAnnualTarget,
        quarterlyIncomeTarget: calculated.quarterlyIncomeTarget,
        monthlyIncomeTarget: calculated.monthlyIncomeTarget,
        annualPoliciesTarget: calculated.annualPoliciesTarget,
        monthlyPoliciesTarget: calculated.monthlyPoliciesTarget,
        // REMOVED: avgPremiumTarget - always calculated from actual policies
        persistency13MonthTarget: calculated.persistency13MonthTarget,
        persistency25MonthTarget: calculated.persistency25MonthTarget,
        monthlyExpenseTarget: calculated.monthlyExpenseTarget,
        expenseRatioTarget: calculated.expenseRatio,
      });

      setCalculatedTargets(calculated);
      setAnnualTarget(newAnnualTarget);
      toast.success("Target updated successfully");
    } catch (err) {
      toast.error("Failed to update target");
      throw err;
    }
  };

  const handleInlineEdit = () => {
    setInlineEditValue(annualTarget.toString());
    setIsEditingInline(true);
  };

  const handleInlineSave = async () => {
    const value = parseFloat(inlineEditValue.replace(/,/g, ""));

    if (isNaN(value) || value <= 0) {
      toast.error("Please enter a valid target amount");
      return;
    }

    await handleSaveTarget(value);
    setIsEditingInline(false);
  };

  const handleInlineCancel = () => {
    setIsEditingInline(false);
    setInlineEditValue("");
  };

  if (isLoading || averagesLoading) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-zinc-500 dark:text-zinc-400 text-sm">
          Loading targets...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="text-red-600 dark:text-red-400 text-sm">
          Error: {error.message}
        </div>
      </div>
    );
  }

  // If targets exist but annual target is 0 (first time), show dialog only
  if (!targets) {
    return null;
  }

  // Calculate target year (next year if in Q4)
  const now = new Date();
  const currentMonth = now.getMonth();
  const isQ4 = currentMonth >= 9;
  const targetYear = isQ4 ? now.getFullYear() + 1 : now.getFullYear();

  // First-time users: show only the dialog to set their initial target
  if (isFirstTime || !calculatedTargets) {
    return (
      <>
        <div className="h-[calc(100vh-4rem)] flex flex-col p-3 bg-zinc-50 dark:bg-zinc-950">
          {/* Header Card - matches app styling */}
          <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800 mb-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Income Targets {targetYear}
              </h1>
            </div>
          </div>

          {/* TODO: Welcome Content - Needs to be restyled to match my styles of the rest of my application. look for other dialogs for exampe add user add recruit dialogs for a better understanding of how i want it styled*/}
          <div className="flex-1 flex items-center justify-center">
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 max-w-md text-center">
              <div className="p-3 bg-blue-500/10 rounded-full w-fit mx-auto mb-4">
                <Target className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                Set Your {targetYear} Income Target
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                Enter your annual net income goal to get started. We'll
                automatically calculate monthly, weekly, and daily targets based
                on your historical data.
              </p>
              <Button
                onClick={() => setShowInputDialog(true)}
                className="w-full"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
        <TargetInputDialog
          open={showInputDialog}
          onClose={() => setShowInputDialog(false)}
          onSave={handleSaveTarget}
          currentTarget={annualTarget}
          isFirstTime={isFirstTime}
        />
      </>
    );
  }

  const _getProgress = (actual: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(100, (actual / target) * 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "text-emerald-600 dark:text-emerald-400";
    if (progress >= 75) return "text-blue-600 dark:text-blue-400";
    if (progress >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <>
      <div className="h-[calc(100vh-4rem)] flex flex-col p-3 space-y-2.5 bg-zinc-50 dark:bg-zinc-950">
        {/* Compact Header */}
        <div className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-zinc-900 dark:text-zinc-100" />
            <div>
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Income Targets {targetYear}
              </h1>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                Based on{" "}
                {calculatedTargets.calculationMethod === "historical"
                  ? "your historical data"
                  : "industry averages"}
              </p>
            </div>
          </div>
          {!isEditingInline ? (
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase">
                  NET Annual Target
                </div>
                <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {formatCurrency(calculatedTargets.annualIncomeTarget)}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleInlineEdit}
                className="h-6 w-6 p-0"
              >
                <Edit2 className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <Input
                type="text"
                value={inlineEditValue}
                onChange={(e) => setInlineEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInlineSave();
                  if (e.key === "Escape") handleInlineCancel();
                }}
                className="w-32 h-7 text-sm font-bold"
                autoFocus
              />
              <Button
                size="sm"
                onClick={handleInlineSave}
                className="h-7 px-2 text-xs"
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleInlineCancel}
                className="h-7 px-2 text-xs"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="space-y-2">
            {/* NET vs GROSS Breakdown - New Section */}
            <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
              <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Income Calculation Breakdown
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        NET Income Target (Take Home)
                      </span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(calculatedTargets.annualIncomeTarget)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        + Annual Expenses
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(calculatedTargets.annualExpenses)}
                      </span>
                    </div>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400 font-semibold">
                        = GROSS Commission Needed
                      </span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(
                          calculatedTargets.annualIncomeTarget +
                            calculatedTargets.annualExpenses,
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-l border-zinc-200 dark:border-zinc-800 pl-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Gross Commission
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(
                          calculatedTargets.annualIncomeTarget +
                            calculatedTargets.annualExpenses,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        ÷ Commission Rate
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {(calculatedTargets.avgCommissionRate * 100).toFixed(1)}
                        %
                      </span>
                    </div>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400 font-semibold">
                        = Premium Needed
                      </span>
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(calculatedTargets.totalPremiumNeeded)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="border-l border-zinc-200 dark:border-zinc-800 pl-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Premium Needed
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(calculatedTargets.totalPremiumNeeded)}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        ÷ Avg Premium
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(calculatedTargets.avgPolicyPremium)}
                      </span>
                    </div>
                    <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400 font-semibold">
                        = Policies Needed
                      </span>
                      <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                        {calculatedTargets.annualPoliciesTarget} policies
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Section: Income & Policy Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              {/* Income Targets - Compact */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  NET Income Targets
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Annual
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(calculatedTargets.annualIncomeTarget)}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          getProgressColor(
                            (actualMetrics.ytdIncome /
                              calculatedTargets.annualIncomeTarget) *
                              100,
                          ),
                        )}
                      >
                        ({formatCurrency(actualMetrics.ytdIncome)} YTD)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Quarterly
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(
                          calculatedTargets.quarterlyIncomeTarget,
                        )}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          getProgressColor(
                            (actualMetrics.qtdIncome /
                              calculatedTargets.quarterlyIncomeTarget) *
                              100,
                          ),
                        )}
                      >
                        ({formatCurrency(actualMetrics.qtdIncome)} QTD)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Monthly
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {formatCurrency(calculatedTargets.monthlyIncomeTarget)}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          getProgressColor(
                            (actualMetrics.mtdIncome /
                              calculatedTargets.monthlyIncomeTarget) *
                              100,
                          ),
                        )}
                      >
                        ({formatCurrency(actualMetrics.mtdIncome)} MTD)
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Weekly
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(calculatedTargets.weeklyIncomeTarget)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Daily
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(calculatedTargets.dailyIncomeTarget)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Policy Targets - Compact */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Policy Targets
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Annual
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {calculatedTargets.annualPoliciesTarget}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          getProgressColor(
                            (actualMetrics.ytdPolicies /
                              calculatedTargets.annualPoliciesTarget) *
                              100,
                          ),
                        )}
                      >
                        ({actualMetrics.ytdPolicies} YTD)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Quarterly
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {calculatedTargets.quarterlyPoliciesTarget}
                      </span>
                      <span className="font-mono text-[10px] text-zinc-400 dark:text-zinc-500">
                        ({Math.floor(actualMetrics.ytdPolicies / 4)} avg)
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Monthly
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {calculatedTargets.monthlyPoliciesTarget}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px]",
                          getProgressColor(
                            (actualMetrics.mtdPolicies /
                              calculatedTargets.monthlyPoliciesTarget) *
                              100,
                          ),
                        )}
                      >
                        ({actualMetrics.mtdPolicies} MTD)
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Weekly
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {calculatedTargets.weeklyPoliciesTarget}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Daily
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {calculatedTargets.dailyPoliciesTarget}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Expenses Breakdown, Metrics, Persistency */}
            <div className="grid grid-cols-3 gap-2">
              {/* Expense Breakdown - More Detail */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Expense Analysis
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Monthly Target
                    </span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(calculatedTargets.monthlyExpenseTarget)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      MTD Actual
                    </span>
                    <span
                      className={cn(
                        "font-mono",
                        actualMetrics.mtdExpenses >
                          calculatedTargets.monthlyExpenseTarget
                          ? "text-red-600 dark:text-red-400"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {formatCurrency(actualMetrics.mtdExpenses)}
                    </span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Annual Total
                    </span>
                    <span className="font-mono text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(calculatedTargets.annualExpenses)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Expense Ratio
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {formatPercent(calculatedTargets.expenseRatio * 100)}
                    </span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                  <div
                    className={cn(
                      "text-[10px]",
                      calculatedTargets.expenseRatio > 0.3
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-emerald-600 dark:text-emerald-400",
                    )}
                  >
                    {calculatedTargets.expenseRatio > 0.3
                      ? "⚠️ High expense ratio"
                      : "✓ Healthy expense ratio"}
                  </div>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Key Metrics
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      Commission Rate
                      {commissionProfile?.dataQuality === "HIGH" && (
                        <span
                          className="text-[9px] text-emerald-600 dark:text-emerald-400"
                          title="Based on your sales mix - high confidence (20+ policies)"
                        >
                          ✓
                        </span>
                      )}
                      {commissionProfile?.dataQuality === "MEDIUM" && (
                        <span
                          className="text-[9px] text-blue-600 dark:text-blue-400"
                          title="Based on limited sales data - moderate confidence (10-19 policies)"
                        >
                          ℹ️
                        </span>
                      )}
                      {commissionProfile?.dataQuality === "LOW" && (
                        <span
                          className="text-[9px] text-amber-600 dark:text-amber-400"
                          title="Based on very limited sales data - low confidence (1-9 policies)"
                        >
                          ⚠
                        </span>
                      )}
                      {commissionProfile?.dataQuality === "DEFAULT" && (
                        <span
                          className="text-[9px] text-amber-600 dark:text-amber-400"
                          title="Using default rate - no recent policies found"
                        >
                          ⚠
                        </span>
                      )}
                      {commissionProfile?.dataQuality === "NONE" && (
                        <span
                          className="text-[9px] text-red-600 dark:text-red-400"
                          title="No commission data available"
                        >
                          ❌
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {(calculatedTargets.avgCommissionRate * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Avg Premium
                    </span>
                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(calculatedTargets.avgPolicyPremium)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Current Avg
                    </span>
                    <span
                      className={cn(
                        "font-mono",
                        actualMetrics.currentAvgPremium <
                          calculatedTargets.avgPolicyPremium
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400",
                      )}
                    >
                      {formatCurrency(actualMetrics.currentAvgPremium)}
                    </span>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Data Confidence
                    </span>
                    <span
                      className={cn(
                        "font-semibold text-[10px]",
                        calculatedTargets.confidence === "high"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : calculatedTargets.confidence === "medium"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-red-600 dark:text-red-400",
                      )}
                    >
                      {calculatedTargets.confidence.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Method
                    </span>
                    <span className="text-[10px] font-medium text-zinc-900 dark:text-zinc-100">
                      {calculatedTargets.calculationMethod}
                    </span>
                  </div>
                  {commissionProfile?.dataQuality === "HIGH" && (
                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="text-[9px] text-emerald-600 dark:text-emerald-400">
                        ✓ Commission rate calculated from your sales mix (high
                        confidence)
                      </div>
                    </div>
                  )}
                  {commissionProfile?.dataQuality === "MEDIUM" && (
                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="text-[9px] text-blue-600 dark:text-blue-400">
                        ℹ️ Commission rate based on limited data. Add more
                        policies for better accuracy.
                      </div>
                    </div>
                  )}
                  {commissionProfile?.dataQuality === "LOW" && (
                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="text-[9px] text-amber-600 dark:text-amber-400">
                        ⚠ Commission rate based on very limited data. Add more
                        policies for accuracy.
                      </div>
                    </div>
                  )}
                  {commissionProfile?.dataQuality === "DEFAULT" && (
                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="text-[9px] text-amber-600 dark:text-amber-400">
                        ⚠ Commission rate is using defaults. Add policies to get
                        your actual rate.
                      </div>
                    </div>
                  )}
                  {commissionProfile?.dataQuality === "NONE" && (
                    <div className="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                      <div className="text-[9px] text-red-600 dark:text-red-400">
                        ❌ No commission data available. Contact admin to
                        configure rates.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Persistency */}
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
                <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                  Persistency Rates
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        13-Month Target
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100">
                        {formatPercent(
                          calculatedTargets.persistency13MonthTarget * 100,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        13-Month Actual
                      </span>
                      <span
                        className={cn(
                          "font-mono font-semibold",
                          getProgressColor(
                            (actualMetrics.persistency13Month /
                              calculatedTargets.persistency13MonthTarget) *
                              100,
                          ),
                        )}
                      >
                        {formatPercent(actualMetrics.persistency13Month * 100)}
                      </span>
                    </div>
                  </div>
                  <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />
                  <div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        25-Month Target
                      </span>
                      <span className="font-mono text-zinc-900 dark:text-zinc-100">
                        {formatPercent(
                          calculatedTargets.persistency25MonthTarget * 100,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        25-Month Actual
                      </span>
                      <span
                        className={cn(
                          "font-mono font-semibold",
                          getProgressColor(
                            (actualMetrics.persistency25Month /
                              calculatedTargets.persistency25MonthTarget) *
                              100,
                          ),
                        )}
                      >
                        {formatPercent(actualMetrics.persistency25Month * 100)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* What-If Persistency Scenarios */}
            <PersistencyScenarios
              baseAnnualPolicies={calculatedTargets.annualPoliciesTarget}
              totalPremiumNeeded={calculatedTargets.totalPremiumNeeded}
              avgPolicyPremium={calculatedTargets.avgPolicyPremium}
              currentPersistency={actualMetrics.persistency13Month || 0.85}
              avgCommissionRate={calculatedTargets.avgCommissionRate}
              annualIncomeTarget={calculatedTargets.annualIncomeTarget}
              monthlyExpenseTarget={calculatedTargets.monthlyExpenseTarget}
            />

            {/* Validation Warnings - Compact */}
            {(() => {
              const validation = targetsCalculationService.validateTargets(
                calculatedTargets,
                averages.hasData ? averages : undefined,
              );

              if (
                validation.warnings.length > 0 ||
                validation.recommendations.length > 0
              ) {
                return (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 flex items-start gap-2">
                    <AlertCircle className="h-3 w-3 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div className="space-y-0.5">
                      {validation.warnings.map((warning, i) => (
                        <p
                          key={i}
                          className="text-[11px] font-medium text-amber-700 dark:text-amber-300"
                        >
                          {warning}
                        </p>
                      ))}
                      {validation.recommendations.map((rec, i) => (
                        <p
                          key={i}
                          className="text-[10px] text-amber-600 dark:text-amber-400"
                        >
                          {rec}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
      </div>

      {/* Target Input Dialog */}
      <TargetInputDialog
        open={showInputDialog}
        onClose={() => setShowInputDialog(false)}
        onSave={handleSaveTarget}
        currentTarget={annualTarget}
        isFirstTime={isFirstTime}
      />
    </>
  );
}
