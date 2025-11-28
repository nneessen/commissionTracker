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
      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Target className="h-5 w-5" />
              Targets
            </h1>
            <p className="page-subtitle text-muted-foreground">
              Your {new Date().getFullYear()} commission income goals and pace tracking
            </p>
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="grid gap-4">
          {/* Main Target Input Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Annual Income Target
                </span>
                <MetricTooltip
                  title="Annual Income Target (NET)"
                  description="Your NET take-home income goal AFTER business expenses. The system automatically calculates how much gross commission you need to earn to hit this target after paying expenses."
                  formula="Gross Commission Needed = NET Income Target + Annual Expenses"
                  note="Everything else is calculated based on your historical averages and expense data"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                {isEditingInline ? (
                  <>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="text"
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleInlineSave();
                          if (e.key === 'Escape') handleInlineCancel();
                        }}
                        className="pl-7 text-2xl font-bold"
                        autoFocus
                      />
                    </div>
                    <Button size="sm" onClick={handleInlineSave}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleInlineCancel}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="text-3xl font-bold">
                      {formatCurrency(calculatedTargets.annualIncomeTarget)}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleInlineEdit}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Based on {calculatedTargets.calculationMethod === 'historical'
                  ? `your historical average commission rate of ${(calculatedTargets.avgCommissionRate * 100).toFixed(1)}% and average policy size of ${formatCurrency(calculatedTargets.avgPolicyPremium)}`
                  : 'default industry averages (you\'ll get personalized calculations as you add data)'}
              </p>
            </CardContent>
          </Card>

          {/* Income Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Income Targets by Period
                <MetricTooltip
                  title="Income Breakdown"
                  description="Your annual target divided into smaller time periods for easier tracking and goal setting."
                  formula="Each period = Annual Target ÷ Number of periods"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-1 font-semibold text-muted-foreground">
                        Period
                      </th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground">
                        Target
                      </th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground">
                        Current
                      </th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <MetricRow
                      label="Annual"
                      target={calculatedTargets.annualIncomeTarget}
                      actual={actualMetrics.ytdIncome}
                      tooltip={{
                        title: "Annual Income Target",
                        description: "Your total commission income goal for the year.",
                        formula: "Sum of all commission earnings January - December",
                      }}
                    />
                    <MetricRow
                      label="Quarterly"
                      target={calculatedTargets.quarterlyIncomeTarget}
                      actual={actualMetrics.qtdIncome}
                      tooltip={{
                        title: "Quarterly Income Target",
                        description: "Your commission income goal per quarter (3 months).",
                        formula: "Annual Target ÷ 4 quarters",
                        example: `$${calculatedTargets.annualIncomeTarget.toLocaleString()} ÷ 4 = ${formatCurrency(calculatedTargets.quarterlyIncomeTarget)}`
                      }}
                    />
                    <MetricRow
                      label="Monthly"
                      target={calculatedTargets.monthlyIncomeTarget}
                      actual={actualMetrics.mtdIncome}
                      tooltip={{
                        title: "Monthly Income Target",
                        description: "Your commission income goal per month.",
                        formula: "Annual Target ÷ 12 months",
                        example: `$${calculatedTargets.annualIncomeTarget.toLocaleString()} ÷ 12 = ${formatCurrency(calculatedTargets.monthlyIncomeTarget)}`
                      }}
                    />
                    <MetricRow
                      label="Weekly"
                      target={calculatedTargets.weeklyIncomeTarget}
                      actual={0}
                      showProgress={false}
                      tooltip={{
                        title: "Weekly Income Target",
                        description: "Your commission income goal per week.",
                        formula: "Annual Target ÷ 52 weeks",
                        example: `$${calculatedTargets.annualIncomeTarget.toLocaleString()} ÷ 52 = ${formatCurrency(calculatedTargets.weeklyIncomeTarget)}`
                      }}
                    />
                    <MetricRow
                      label="Daily"
                      target={calculatedTargets.dailyIncomeTarget}
                      actual={0}
                      showProgress={false}
                      tooltip={{
                        title: "Daily Income Target",
                        description: "Your commission income goal per day.",
                        formula: "Annual Target ÷ 365 days",
                        example: `$${calculatedTargets.annualIncomeTarget.toLocaleString()} ÷ 365 = ${formatCurrency(calculatedTargets.dailyIncomeTarget)}`,
                        note: "Use this for daily motivation and pace tracking"
                      }}
                    />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Policy Requirements */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Policies Required
                <MetricTooltip
                  title="Policy Requirements"
                  description="Number of policies you need to sell to reach your income target, calculated from your average commission rate and policy size."
                  formula="(Annual Target ÷ Avg Commission %) ÷ Avg Policy Premium"
                />
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  To earn {formatCurrency(calculatedTargets.annualIncomeTarget)}, you need{" "}
                  {formatCurrency(calculatedTargets.totalPremiumNeeded)} in total premium
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-1 font-semibold text-muted-foreground">
                        Period
                      </th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground">
                        Policies Needed
                      </th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground">
                        Current
                      </th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground">
                        Progress
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <PolicyRow
                      label="Annual"
                      target={calculatedTargets.annualPoliciesTarget}
                      actual={actualMetrics.ytdPolicies}
                      tooltip={{
                        title: "Annual Policies Target",
                        description: "Total policies needed this year to hit your income target.",
                        formula: "Total Premium Needed ÷ Avg Policy Premium",
                        example: `${formatCurrency(calculatedTargets.totalPremiumNeeded)} ÷ ${formatCurrency(calculatedTargets.avgPolicyPremium)} = ${calculatedTargets.annualPoliciesTarget} policies`
                      }}
                    />
                    <PolicyRow
                      label="Quarterly"
                      target={calculatedTargets.quarterlyPoliciesTarget}
                      actual={Math.floor(actualMetrics.ytdPolicies / 4)}
                      tooltip={{
                        title: "Quarterly Policies Target",
                        description: "Policies needed per quarter.",
                        formula: "Annual Policies ÷ 4",
                      }}
                    />
                    <PolicyRow
                      label="Monthly"
                      target={calculatedTargets.monthlyPoliciesTarget}
                      actual={actualMetrics.mtdPolicies}
                      tooltip={{
                        title: "Monthly Policies Target",
                        description: "Policies needed per month to stay on track.",
                        formula: "Annual Policies ÷ 12",
                        note: "Focus on this number for monthly goals"
                      }}
                    />
                    <PolicyRow
                      label="Weekly"
                      target={calculatedTargets.weeklyPoliciesTarget}
                      actual={0}
                      showProgress={false}
                      tooltip={{
                        title: "Weekly Policies Target",
                        description: "Policies needed per week.",
                        formula: "Annual Policies ÷ 52",
                      }}
                    />
                    <PolicyRow
                      label="Daily"
                      target={calculatedTargets.dailyPoliciesTarget}
                      actual={0}
                      showProgress={false}
                      tooltip={{
                        title: "Daily Policies Target",
                        description: "Average policies needed per working day.",
                        formula: "Annual Policies ÷ 365 (or ÷ 260 for business days)",
                        note: "This is an average - some days will be higher/lower"
                      }}
                    />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Other Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {/* Persistency Targets */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Persistency Targets
                  <MetricTooltip
                    title="Persistency Rates"
                    description="Percentage of policies that remain active after specific time periods. Higher persistency means better long-term income."
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">13-Month</span>
                      <span className="text-sm font-semibold">
                        {formatPercent(calculatedTargets.persistency13MonthTarget * 100)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current: {formatPercent(actualMetrics.persistency13Month * 100)}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">25-Month</span>
                      <span className="text-sm font-semibold">
                        {formatPercent(calculatedTargets.persistency25MonthTarget * 100)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current: {formatPercent(actualMetrics.persistency25Month * 100)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Expense Metrics */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Expense Metrics
                  <MetricTooltip
                    title="Expense Management"
                    description="Your business expense targets and ratios to maintain profitability."
                  />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Monthly Budget</span>
                      <span className="text-sm font-semibold">
                        {formatCurrency(calculatedTargets.monthlyExpenseTarget)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current: {formatCurrency(actualMetrics.mtdExpenses)}
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        Expense Ratio
                        <MetricTooltip
                          title="Expense Ratio"
                          description="Your total expenses as a percentage of income. Lower is better for profitability."
                          formula="(Annual Expenses ÷ Annual Income) × 100"
                          example="$60,000 expenses ÷ $400,000 income = 15% ratio"
                          note="Target below 30% for healthy margins"
                        />
                      </span>
                      <span className="text-sm font-semibold">
                        {formatPercent(calculatedTargets.expenseRatio * 100)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Current: {formatPercent(actualMetrics.currentExpenseRatio * 100)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Calculation Breakdown */}
          <CalculationBreakdown targets={calculatedTargets} />

          {/* Validation Warnings */}
          {(() => {
            const validation = targetsCalculationService.validateTargets(
              calculatedTargets,
              averages.hasData ? averages : undefined
            );

            if (validation.warnings.length > 0 || validation.recommendations.length > 0) {
              return (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-2">
                      {validation.warnings.map((warning, i) => (
                        <p key={i} className="text-sm">{warning}</p>
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

// Helper component for income metric rows
interface MetricRowProps {
  label: string;
  target: number;
  actual: number;
  showProgress?: boolean;
  tooltip?: {
    title: string;
    description: string;
    formula?: string;
    example?: string;
    note?: string;
  };
}

function MetricRow({ label, target, actual, showProgress = true, tooltip }: MetricRowProps) {
  const progress = target > 0 ? (actual / target) * 100 : 0;
  const getStatusClass = () => {
    if (progress >= 100) return "text-success";
    if (progress >= 75) return "text-info";
    if (progress >= 50) return "text-warning";
    return "text-error";
  };

  return (
    <tr className="hover:bg-muted/10 transition-colors">
      <td className="py-2 px-1 text-foreground flex items-center gap-1">
        {label}
        {tooltip && <MetricTooltip {...tooltip} />}
      </td>
      <td className="py-2 px-1 text-right font-mono font-semibold">
        {formatCurrency(target)}
      </td>
      <td className="py-2 px-1 text-right text-muted-foreground font-mono">
        {formatCurrency(actual)}
      </td>
      {showProgress && (
        <td className={cn("py-2 px-1 text-right font-semibold", getStatusClass())}>
          {progress.toFixed(0)}%
        </td>
      )}
    </tr>
  );
}

// Helper component for policy metric rows
interface PolicyRowProps {
  label: string;
  target: number;
  actual: number;
  showProgress?: boolean;
  tooltip?: {
    title: string;
    description: string;
    formula?: string;
    example?: string;
    note?: string;
  };
}

function PolicyRow({ label, target, actual, showProgress = true, tooltip }: PolicyRowProps) {
  const progress = target > 0 ? (actual / target) * 100 : 0;
  const getStatusClass = () => {
    if (progress >= 100) return "text-success";
    if (progress >= 75) return "text-info";
    if (progress >= 50) return "text-warning";
    return "text-error";
  };

  return (
    <tr className="hover:bg-muted/10 transition-colors">
      <td className="py-2 px-1 text-foreground flex items-center gap-1">
        {label}
        {tooltip && <MetricTooltip {...tooltip} />}
      </td>
      <td className="py-2 px-1 text-right font-mono font-semibold">
        {target} {target === 1 ? 'policy' : 'policies'}
      </td>
      <td className="py-2 px-1 text-right text-muted-foreground font-mono">
        {actual}
      </td>
      {showProgress && (
        <td className={cn("py-2 px-1 text-right font-semibold", getStatusClass())}>
          {progress.toFixed(0)}%
        </td>
      )}
    </tr>
  );
}