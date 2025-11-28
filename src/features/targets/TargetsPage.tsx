// src/features/targets/TargetsPage.tsx

import { useState, useEffect } from "react";
import {
  useTargets,
  useUpdateTargets,
  useActualMetrics,
} from "../../hooks/targets";
import { useHistoricalAverages } from "../../hooks/targets/useHistoricalAverages";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Edit2,
  Target,
  TrendingUp,
  DollarSign,
  Calendar,
  FileText,
  AlertCircle,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency, formatPercent } from "../../lib/format";
import { MetricTooltip } from "../../components/ui/MetricTooltip";
import showToast from "../../utils/toast";
import { targetsCalculationService, CalculatedTargets } from "../../services/targets/targetsCalculationService";
import { TargetInputDialog } from "./components/TargetInputDialog";
import { CalculationBreakdown } from "./components/CalculationBreakdown";

export function TargetsPage() {
  const { data: targets, isLoading, error } = useTargets();
  const actualMetrics = useActualMetrics();
  const updateTargets = useUpdateTargets();
  const { averages, isLoading: averagesLoading } = useHistoricalAverages();

  const [showInputDialog, setShowInputDialog] = useState(false);
  const [calculatedTargets, setCalculatedTargets] = useState<CalculatedTargets | null>(null);
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
      showToast.success("Target updated successfully");
    } catch (err) {
      showToast.error("Failed to update target");
      throw err;
    }
  };

  const handleInlineEdit = () => {
    setInlineEditValue(annualTarget.toString());
    setIsEditingInline(true);
  };

  const handleInlineSave = async () => {
    const value = parseFloat(inlineEditValue.replace(/,/g, ''));

    if (isNaN(value) || value <= 0) {
      showToast.error("Please enter a valid target amount");
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground text-sm">Loading targets...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-error text-sm">Error: {error.message}</div>
      </div>
    );
  }

  if (!targets || !calculatedTargets) {
    return null;
  }

  const getProgress = (actual: number, target: number) => {
    if (target === 0) return 0;
    return Math.min(100, (actual / target) * 100);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "text-success";
    if (progress >= 75) return "text-info";
    if (progress >= 50) return "text-warning";
    return "text-error";
  };

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Income Targets {new Date().getFullYear()}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Based on {calculatedTargets.calculationMethod === 'historical' ? 'your historical data' : 'industry averages'}
              </p>
            </div>
            {!isEditingInline ? (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Annual Goal</div>
                  <div className="text-3xl font-bold">{formatCurrency(calculatedTargets.annualIncomeTarget)}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={handleInlineEdit}>
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  value={inlineEditValue}
                  onChange={(e) => setInlineEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleInlineSave();
                    if (e.key === 'Escape') handleInlineCancel();
                  }}
                  className="w-40 text-lg font-bold"
                  autoFocus
                />
                <Button size="sm" onClick={handleInlineSave}>Save</Button>
                <Button size="sm" variant="ghost" onClick={handleInlineCancel}>Cancel</Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* Top Section: Income & Policy Breakdown */}
            <div className="grid grid-cols-2 gap-6">

              {/* Income Targets - Data Dense */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-success" />
                    Income Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Annual</span>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(calculatedTargets.annualIncomeTarget)}</div>
                        <div className={cn("text-xs", getProgressColor((actualMetrics.ytdIncome / calculatedTargets.annualIncomeTarget) * 100))}>
                          {formatCurrency(actualMetrics.ytdIncome)} YTD
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Quarterly</span>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(calculatedTargets.quarterlyIncomeTarget)}</div>
                        <div className={cn("text-xs", getProgressColor((actualMetrics.qtdIncome / calculatedTargets.quarterlyIncomeTarget) * 100))}>
                          {formatCurrency(actualMetrics.qtdIncome)} QTD
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Monthly</span>
                      <div className="text-right">
                        <div className="text-lg font-bold">{formatCurrency(calculatedTargets.monthlyIncomeTarget)}</div>
                        <div className={cn("text-xs", getProgressColor((actualMetrics.mtdIncome / calculatedTargets.monthlyIncomeTarget) * 100))}>
                          {formatCurrency(actualMetrics.mtdIncome)} MTD
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 bg-muted/20 -mx-6 px-6 py-3 rounded">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Weekly</span>
                        <span className="font-mono">{formatCurrency(calculatedTargets.weeklyIncomeTarget)}</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-muted-foreground">Daily</span>
                        <span className="font-mono">{formatCurrency(calculatedTargets.dailyIncomeTarget)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Policy Targets - Data Dense */}
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-info" />
                    Policy Targets
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Annual</span>
                      <div className="text-right">
                        <div className="text-lg font-bold">{calculatedTargets.annualPoliciesTarget} policies</div>
                        <div className={cn("text-xs", getProgressColor((actualMetrics.ytdPolicies / calculatedTargets.annualPoliciesTarget) * 100))}>
                          {actualMetrics.ytdPolicies} YTD
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Quarterly</span>
                      <div className="text-right">
                        <div className="text-lg font-bold">{calculatedTargets.quarterlyPoliciesTarget} policies</div>
                        <div className="text-xs text-muted-foreground">
                          {Math.floor(actualMetrics.ytdPolicies / 4)} avg/quarter
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-baseline">
                      <span className="text-sm text-muted-foreground">Monthly</span>
                      <div className="text-right">
                        <div className="text-lg font-bold">{calculatedTargets.monthlyPoliciesTarget} policies</div>
                        <div className={cn("text-xs", getProgressColor((actualMetrics.mtdPolicies / calculatedTargets.monthlyPoliciesTarget) * 100))}>
                          {actualMetrics.mtdPolicies} MTD
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 mt-2 bg-muted/20 -mx-6 px-6 py-3 rounded">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Weekly</span>
                        <span className="font-mono">{calculatedTargets.weeklyPoliciesTarget} policies</span>
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-muted-foreground">Daily</span>
                        <span className="font-mono">{calculatedTargets.dailyPoliciesTarget} {calculatedTargets.dailyPoliciesTarget === 1 ? 'policy' : 'policies'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Section: Calculations, Expenses, Persistency */}
            <div className="grid grid-cols-3 gap-6">

              {/* Calculation Basis */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">How It's Calculated</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Commission Rate</span>
                    <span className="font-mono font-semibold">{(calculatedTargets.avgCommissionRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Avg Policy Premium</span>
                    <span className="font-mono font-semibold">{formatCurrency(calculatedTargets.avgPolicyPremium)}</span>
                  </div>
                  <div className="flex justify-between pt-2 mt-2 bg-accent/10 -mx-6 px-6 py-2 rounded">
                    <span className="text-muted-foreground">Total Premium Needed</span>
                    <span className="font-mono font-bold">{formatCurrency(calculatedTargets.totalPremiumNeeded)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Expenses */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Business Expenses</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Monthly Budget</span>
                    <span className="font-mono font-semibold">{formatCurrency(calculatedTargets.monthlyExpenseTarget)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MTD Actual</span>
                    <span className="font-mono">{formatCurrency(actualMetrics.mtdExpenses)}</span>
                  </div>
                  <div className="flex justify-between pt-2 mt-2 bg-accent/10 -mx-6 px-6 py-2 rounded">
                    <span className="text-muted-foreground">Expense Ratio</span>
                    <span className="font-mono font-bold">{formatPercent(calculatedTargets.expenseRatio * 100)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Persistency */}
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-base">Persistency Rates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">13-Month</span>
                      <span className="font-mono">{formatPercent(calculatedTargets.persistency13MonthTarget * 100)} target</span>
                    </div>
                    <div className={cn("text-right font-mono font-semibold", getProgressColor((actualMetrics.persistency13Month / calculatedTargets.persistency13MonthTarget) * 100))}>
                      {formatPercent(actualMetrics.persistency13Month * 100)} actual
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-muted-foreground">25-Month</span>
                      <span className="font-mono">{formatPercent(calculatedTargets.persistency25MonthTarget * 100)} target</span>
                    </div>
                    <div className={cn("text-right font-mono font-semibold", getProgressColor((actualMetrics.persistency25Month / calculatedTargets.persistency25MonthTarget) * 100))}>
                      {formatPercent(actualMetrics.persistency25Month * 100)} actual
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Validation Warnings */}
            {(() => {
              const validation = targetsCalculationService.validateTargets(
                calculatedTargets,
                averages.hasData ? averages : undefined
              );

              if (validation.warnings.length > 0 || validation.recommendations.length > 0) {
                return (
                  <Alert className="shadow-md">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-1">
                        {validation.warnings.map((warning, i) => (
                          <p key={i} className="text-sm font-medium">{warning}</p>
                        ))}
                        {validation.recommendations.map((rec, i) => (
                          <p key={i} className="text-sm text-muted-foreground">{rec}</p>
                        ))}
                      </div>
                    </AlertDescription>
                  </Alert>
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