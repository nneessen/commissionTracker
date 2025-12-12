// src/features/targets/TargetsPage.tsx

import {useState, useEffect} from "react";
import {useTargets, useUpdateTargets, useActualMetrics} from "../../hooks/targets";
import {useHistoricalAverages} from "../../hooks/targets/useHistoricalAverages";
import {Card, CardContent, CardHeader, CardTitle} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Alert, AlertDescription} from "@/components/ui/alert";
import {Edit2, Target, TrendingUp, DollarSign, Calendar, FileText, AlertCircle, ChevronRight} from "lucide-react";
import {cn} from "@/lib/utils";
import {formatCurrency, formatPercent} from "../../lib/format";
import {MetricTooltip} from "../../components/ui/MetricTooltip";
import showToast from "../../utils/toast";
import {targetsCalculationService, CalculatedTargets} from "../../services/targets/targetsCalculationService";
import {TargetInputDialog} from "./components/TargetInputDialog";
import {CalculationBreakdown} from "./components/CalculationBreakdown";
import {PersistencyScenarios} from "./components/PersistencyScenarios";

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

  const _getProgress = (actual: number, target: number) => {
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
        {/* Compact Header */}
        <div className="page-header py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-base font-semibold text-foreground">Income Targets {new Date().getFullYear()}</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Based on {calculatedTargets.calculationMethod === 'historical' ? 'your historical data' : 'industry averages'}
              </p>
            </div>
            {!isEditingInline ? (
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[10px] font-medium text-muted-foreground uppercase">NET Annual Target</div>
                  <div className="text-lg font-bold">{formatCurrency(calculatedTargets.annualIncomeTarget)}</div>
                </div>
                <Button size="sm" variant="ghost" onClick={handleInlineEdit} className="h-6 w-6 p-0">
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
                    if (e.key === 'Enter') handleInlineSave();
                    if (e.key === 'Escape') handleInlineCancel();
                  }}
                  className="w-32 h-7 text-sm font-bold"
                  autoFocus
                />
                <Button size="sm" onClick={handleInlineSave} className="h-7 px-2 text-xs">Save</Button>
                <Button size="sm" variant="ghost" onClick={handleInlineCancel} className="h-7 px-2 text-xs">Cancel</Button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-3 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-2">

            {/* NET vs GROSS Breakdown - New Section */}
            <Card>
              <CardContent className="p-3">
                <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Income Calculation Breakdown</div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">NET Income Target (Take Home)</span>
                        <span className="font-mono font-bold text-success">{formatCurrency(calculatedTargets.annualIncomeTarget)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">+ Annual Expenses</span>
                        <span className="font-mono">{formatCurrency(calculatedTargets.monthlyExpenseTarget * 12)}</span>
                      </div>
                      <div className="h-px bg-border my-1" />
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold">= GROSS Commission Needed</span>
                        <span className="font-mono font-bold">{formatCurrency(calculatedTargets.annualIncomeTarget + (calculatedTargets.monthlyExpenseTarget * 12))}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-l pl-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Gross Commission</span>
                        <span className="font-mono">{formatCurrency(calculatedTargets.annualIncomeTarget + (calculatedTargets.monthlyExpenseTarget * 12))}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">÷ Commission Rate</span>
                        <span className="font-mono font-semibold">{(calculatedTargets.avgCommissionRate * 100).toFixed(1)}%</span>
                      </div>
                      <div className="h-px bg-border my-1" />
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold">= Premium Needed</span>
                        <span className="font-mono font-bold">{formatCurrency(calculatedTargets.totalPremiumNeeded)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-l pl-4">
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">Premium Needed</span>
                        <span className="font-mono">{formatCurrency(calculatedTargets.totalPremiumNeeded)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">÷ Avg Premium</span>
                        <span className="font-mono font-semibold">{formatCurrency(calculatedTargets.avgPolicyPremium)}</span>
                      </div>
                      <div className="h-px bg-border my-1" />
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground font-semibold">= Policies Needed</span>
                        <span className="font-mono font-bold text-info">{calculatedTargets.annualPoliciesTarget} policies</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Section: Income & Policy Breakdown */}
            <div className="grid grid-cols-2 gap-2">

              {/* Income Targets - Compact */}
              <Card>
                <CardContent className="p-3">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">NET Income Targets</div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Annual</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{formatCurrency(calculatedTargets.annualIncomeTarget)}</span>
                        <span className={cn("font-mono text-[10px]", getProgressColor((actualMetrics.ytdIncome / calculatedTargets.annualIncomeTarget) * 100))}>
                          ({formatCurrency(actualMetrics.ytdIncome)} YTD)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Quarterly</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{formatCurrency(calculatedTargets.quarterlyIncomeTarget)}</span>
                        <span className={cn("font-mono text-[10px]", getProgressColor((actualMetrics.qtdIncome / calculatedTargets.quarterlyIncomeTarget) * 100))}>
                          ({formatCurrency(actualMetrics.qtdIncome)} QTD)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Monthly</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{formatCurrency(calculatedTargets.monthlyIncomeTarget)}</span>
                        <span className={cn("font-mono text-[10px]", getProgressColor((actualMetrics.mtdIncome / calculatedTargets.monthlyIncomeTarget) * 100))}>
                          ({formatCurrency(actualMetrics.mtdIncome)} MTD)
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-border my-1" />

                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Weekly</span>
                      <span className="font-mono">{formatCurrency(calculatedTargets.weeklyIncomeTarget)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Daily</span>
                      <span className="font-mono">{formatCurrency(calculatedTargets.dailyIncomeTarget)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Policy Targets - Compact */}
              <Card>
                <CardContent className="p-3">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Policy Targets</div>
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Annual</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{calculatedTargets.annualPoliciesTarget}</span>
                        <span className={cn("font-mono text-[10px]", getProgressColor((actualMetrics.ytdPolicies / calculatedTargets.annualPoliciesTarget) * 100))}>
                          ({actualMetrics.ytdPolicies} YTD)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Quarterly</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{calculatedTargets.quarterlyPoliciesTarget}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">
                          ({Math.floor(actualMetrics.ytdPolicies / 4)} avg)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[11px]">
                      <span className="text-muted-foreground">Monthly</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold">{calculatedTargets.monthlyPoliciesTarget}</span>
                        <span className={cn("font-mono text-[10px]", getProgressColor((actualMetrics.mtdPolicies / calculatedTargets.monthlyPoliciesTarget) * 100))}>
                          ({actualMetrics.mtdPolicies} MTD)
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-border my-1" />

                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Weekly</span>
                      <span className="font-mono">{calculatedTargets.weeklyPoliciesTarget}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Daily</span>
                      <span className="font-mono">{calculatedTargets.dailyPoliciesTarget}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Bottom Section: Expenses Breakdown, Metrics, Persistency */}
            <div className="grid grid-cols-3 gap-2">

              {/* Expense Breakdown - More Detail */}
              <Card>
                <CardContent className="p-3">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Expense Analysis</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Monthly Target</span>
                      <span className="font-mono font-semibold">{formatCurrency(calculatedTargets.monthlyExpenseTarget)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">MTD Actual</span>
                      <span className={cn("font-mono", actualMetrics.mtdExpenses > calculatedTargets.monthlyExpenseTarget ? "text-error" : "text-success")}>
                        {formatCurrency(actualMetrics.mtdExpenses)}
                      </span>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Annual Projection</span>
                      <span className="font-mono">{formatCurrency(calculatedTargets.monthlyExpenseTarget * 12)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Expense Ratio</span>
                      <span className="font-mono font-bold">{formatPercent(calculatedTargets.expenseRatio * 100)}</span>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div className="text-[10px] text-muted-foreground">
                      {calculatedTargets.expenseRatio > 0.3 ?
                        "⚠️ High expense ratio" :
                        "✓ Healthy expense ratio"}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Key Metrics */}
              <Card>
                <CardContent className="p-3">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Key Metrics</div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Commission Rate</span>
                      <span className="font-mono font-semibold">{(calculatedTargets.avgCommissionRate * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Avg Premium</span>
                      <span className="font-mono font-semibold">{formatCurrency(calculatedTargets.avgPolicyPremium)}</span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Current Avg</span>
                      <span className={cn("font-mono",
                        actualMetrics.currentAvgPremium < calculatedTargets.avgPolicyPremium ? "text-warning" : "text-success"
                      )}>
                        {formatCurrency(actualMetrics.currentAvgPremium)}
                      </span>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Data Confidence</span>
                      <span className={cn("font-semibold text-[10px]",
                        calculatedTargets.confidence === 'high' ? "text-success" :
                        calculatedTargets.confidence === 'medium' ? "text-warning" : "text-error"
                      )}>
                        {calculatedTargets.confidence.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">Method</span>
                      <span className="text-[10px] font-medium">{calculatedTargets.calculationMethod}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Persistency */}
              <Card>
                <CardContent className="p-3">
                  <div className="text-[11px] font-medium text-muted-foreground uppercase mb-2">Persistency Rates</div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">13-Month Target</span>
                        <span className="font-mono">{formatPercent(calculatedTargets.persistency13MonthTarget * 100)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">13-Month Actual</span>
                        <span className={cn("font-mono font-semibold",
                          getProgressColor((actualMetrics.persistency13Month / calculatedTargets.persistency13MonthTarget) * 100))}>
                          {formatPercent(actualMetrics.persistency13Month * 100)}
                        </span>
                      </div>
                    </div>
                    <div className="h-px bg-border my-1" />
                    <div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">25-Month Target</span>
                        <span className="font-mono">{formatPercent(calculatedTargets.persistency25MonthTarget * 100)}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-muted-foreground">25-Month Actual</span>
                        <span className={cn("font-mono font-semibold",
                          getProgressColor((actualMetrics.persistency25Month / calculatedTargets.persistency25MonthTarget) * 100))}>
                          {formatPercent(actualMetrics.persistency25Month * 100)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
                averages.hasData ? averages : undefined
              );

              if (validation.warnings.length > 0 || validation.recommendations.length > 0) {
                return (
                  <Alert className="p-2">
                    <AlertCircle className="h-3 w-3" />
                    <AlertDescription>
                      <div className="space-y-0.5">
                        {validation.warnings.map((warning, i) => (
                          <p key={i} className="text-[11px] font-medium">{warning}</p>
                        ))}
                        {validation.recommendations.map((rec, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground">{rec}</p>
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