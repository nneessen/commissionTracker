// src/features/targets/TargetsPage.tsx

import { useState } from 'react';
import { useTargets, useUpdateTargets, useActualMetrics } from '../../hooks/targets';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Save, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency, formatPercent } from '../../lib/format';
import showToast from '../../utils/toast';

/**
 * Targets Page - Manage and track goals
 *
 * Data-dense table layout showing current targets with inline editing.
 * Follows dashboard design pattern with compact spacing and muted colors.
 */
export function TargetsPage() {
  const { data: targets, isLoading, error } = useTargets();
  const actualMetrics = useActualMetrics();
  const updateTargets = useUpdateTargets();
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, number>>({});

  if (isLoading) {
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

  if (!targets) return null;

  const handleEdit = () => {
    // Only store editable values (annual targets, not derived quarterly/monthly)
    setEditValues({
      annualIncomeTarget: targets.annualIncomeTarget,
      annualPoliciesTarget: targets.annualPoliciesTarget,
      avgPremiumTarget: targets.avgPremiumTarget,
      persistency13MonthTarget: targets.persistency13MonthTarget * 100,
      persistency25MonthTarget: targets.persistency25MonthTarget * 100,
      monthlyExpenseTarget: targets.monthlyExpenseTarget,
      expenseRatioTarget: targets.expenseRatioTarget * 100,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      // Auto-calculate quarterly and monthly from annual targets
      const quarterlyIncomeTarget = editValues.annualIncomeTarget / 4;
      const monthlyIncomeTarget = editValues.annualIncomeTarget / 12;
      const monthlyPoliciesTarget = Math.round(editValues.annualPoliciesTarget / 12);

      await updateTargets.mutateAsync({
        annualIncomeTarget: editValues.annualIncomeTarget,
        quarterlyIncomeTarget,
        monthlyIncomeTarget,
        annualPoliciesTarget: editValues.annualPoliciesTarget,
        monthlyPoliciesTarget,
        avgPremiumTarget: editValues.avgPremiumTarget,
        persistency13MonthTarget: editValues.persistency13MonthTarget / 100,
        persistency25MonthTarget: editValues.persistency25MonthTarget / 100,
        monthlyExpenseTarget: editValues.monthlyExpenseTarget,
        expenseRatioTarget: editValues.expenseRatioTarget / 100,
      });
      setIsEditing(false);
      showToast.success('Targets updated successfully');
    } catch (err) {
      showToast.error('Failed to update targets');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValues({});
  };

  const handleChange = (key: string, value: number) => {
    setEditValues(prev => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div className="page-header">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="page-title">Targets</h1>
            <p className="page-subtitle text-muted-foreground">
              Set and track performance goals
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
                <Button onClick={handleSave} size="sm" disabled={updateTargets.isPending}>
                  <Save className="h-3 w-3 mr-1" />
                  {updateTargets.isPending ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button onClick={handleEdit} variant="outline" size="sm">
                <Edit2 className="h-3 w-3 mr-1" />
                Edit Targets
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        <div className="grid gap-4">
          {/* Income Targets */}
          <Card>
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Income Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto bg-gradient-to-br from-slate-50/50 to-zinc-50/40 dark:from-slate-950/10 dark:to-zinc-950/8 rounded-lg p-4 shadow-sm">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Current</th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TargetRow
                      label="Annual"
                      target={isEditing ? editValues.annualIncomeTarget : targets.annualIncomeTarget}
                      actual={actualMetrics.ytdIncome}
                      unit="$"
                      isEditing={isEditing}
                      onChange={(val) => handleChange('annualIncomeTarget', val)}
                    />
                    <TargetRow
                      label="Quarterly"
                      target={isEditing ? editValues.annualIncomeTarget / 4 : targets.quarterlyIncomeTarget}
                      actual={actualMetrics.qtdIncome}
                      unit="$"
                      isEditing={false}
                      onChange={() => {}}
                    />
                    <TargetRow
                      label="Monthly"
                      target={isEditing ? editValues.annualIncomeTarget / 12 : targets.monthlyIncomeTarget}
                      actual={actualMetrics.mtdIncome}
                      unit="$"
                      isEditing={false}
                      onChange={() => {}}
                    />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Policy Targets */}
          <Card>
            <CardHeader className="p-4 pb-3">
              <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                Policy Targets
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto bg-gradient-to-br from-slate-50/50 to-zinc-50/40 dark:from-slate-950/10 dark:to-zinc-950/8 rounded-lg p-4 shadow-sm">
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Metric</th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Current</th>
                      <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    <TargetRow
                      label="Annual Policies"
                      target={isEditing ? editValues.annualPoliciesTarget : targets.annualPoliciesTarget}
                      actual={actualMetrics.ytdPolicies}
                      unit=""
                      isEditing={isEditing}
                      onChange={(val) => handleChange('annualPoliciesTarget', val)}
                    />
                    <TargetRow
                      label="Monthly Policies"
                      target={isEditing ? Math.round(editValues.annualPoliciesTarget / 12) : targets.monthlyPoliciesTarget}
                      actual={actualMetrics.mtdPolicies}
                      unit=""
                      isEditing={false}
                      onChange={() => {}}
                    />
                    <TargetRow
                      label="Avg Premium"
                      target={isEditing ? editValues.avgPremiumTarget : targets.avgPremiumTarget}
                      actual={actualMetrics.currentAvgPremium}
                      unit="$"
                      isEditing={isEditing}
                      onChange={(val) => handleChange('avgPremiumTarget', val)}
                    />
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Persistency & Expense Targets */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Persistency Targets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto bg-gradient-to-br from-slate-50/50 to-zinc-50/40 dark:from-slate-950/10 dark:to-zinc-950/8 rounded-lg p-4 shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Period</th>
                        <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                        <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      <TargetRow
                        label="13-Month"
                        target={isEditing ? editValues.persistency13MonthTarget : targets.persistency13MonthTarget * 100}
                        actual={actualMetrics.persistency13Month * 100}
                        unit="%"
                        isEditing={isEditing}
                        onChange={(val) => handleChange('persistency13MonthTarget', val)}
                        showProgress={false}
                      />
                      <TargetRow
                        label="25-Month"
                        target={isEditing ? editValues.persistency25MonthTarget : targets.persistency25MonthTarget * 100}
                        actual={actualMetrics.persistency25Month * 100}
                        unit="%"
                        isEditing={isEditing}
                        onChange={(val) => handleChange('persistency25MonthTarget', val)}
                        showProgress={false}
                      />
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-sm uppercase tracking-wide text-muted-foreground">
                  Expense Targets
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto bg-gradient-to-br from-slate-50/50 to-zinc-50/40 dark:from-slate-950/10 dark:to-zinc-950/8 rounded-lg p-4 shadow-sm">
                  <table className="w-full text-xs">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Metric</th>
                        <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Target</th>
                        <th className="text-right py-2 px-1 font-semibold text-muted-foreground uppercase tracking-wider">Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      <TargetRow
                        label="Monthly Budget"
                        target={isEditing ? editValues.monthlyExpenseTarget : targets.monthlyExpenseTarget}
                        actual={actualMetrics.mtdExpenses}
                        unit="$"
                        isEditing={isEditing}
                        onChange={(val) => handleChange('monthlyExpenseTarget', val)}
                        showProgress={false}
                      />
                      <TargetRow
                        label="Expense Ratio"
                        target={isEditing ? editValues.expenseRatioTarget : targets.expenseRatioTarget * 100}
                        actual={actualMetrics.currentExpenseRatio * 100}
                        unit="%"
                        isEditing={isEditing}
                        onChange={(val) => handleChange('expenseRatioTarget', val)}
                        showProgress={false}
                      />
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

interface TargetRowProps {
  label: string;
  target: number;
  actual: number;
  unit: string;
  isEditing: boolean;
  onChange: (value: number) => void;
  showProgress?: boolean;
}

function TargetRow({ label, target, actual, unit, isEditing, onChange, showProgress = true }: TargetRowProps) {
  const progress = target > 0 ? (actual / target) * 100 : 0;

  const getStatusClass = () => {
    if (progress >= 100) return 'text-success';
    if (progress >= 75) return 'text-info';
    if (progress >= 50) return 'text-warning';
    return 'text-error';
  };

  return (
    <tr className="hover:bg-muted/10 transition-colors border-b border-border/50 last:border-0">
      <td className="py-2 px-1 text-foreground">{label}</td>
      <td className="py-2 px-1 text-right">
        {isEditing ? (
          <input
            type="number"
            value={target}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-24 px-2 py-1 text-right text-xs border border-border rounded bg-background"
            step={unit === '$' ? 1000 : unit === '%' ? 1 : 1}
          />
        ) : (
          <span className="font-mono font-semibold text-foreground">
            {unit === '$' ? formatCurrency(target) : unit === '%' ? `${target.toFixed(1)}%` : target}
          </span>
        )}
      </td>
      <td className="py-2 px-1 text-right text-muted-foreground font-mono">
        {unit === '$' ? formatCurrency(actual) : unit === '%' ? `${actual.toFixed(1)}%` : actual}
      </td>
      {showProgress && (
        <td className={cn('py-2 px-1 text-right font-semibold', getStatusClass())}>
          {progress.toFixed(0)}%
        </td>
      )}
    </tr>
  );
}
