// src/features/settings/GoalsManagement.tsx
import React, { useState, useEffect } from 'react';
import { Target, Save, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserTargets, useUpdateUserTargets } from '@/hooks';
import { formatCurrency } from '@/utils/formatters';

export function GoalsManagement() {
  const { data: userTargets, isLoading } = useUserTargets();
  const updateTargets = useUpdateUserTargets();

  // Form state
  const [annualIncomeTarget, setAnnualIncomeTarget] = useState<string>('120000');
  const [monthlyIncomeTarget, setMonthlyIncomeTarget] = useState<string>('10000');
  const [annualPoliciesTarget, setAnnualPoliciesTarget] = useState<string>('100');
  const [monthlyPoliciesTarget, setMonthlyPoliciesTarget] = useState<string>('9');
  const [avgPremiumTarget, setAvgPremiumTarget] = useState<string>('1500');
  const [persistency13Target, setPersistency13Target] = useState<string>('85');

  const [validationError, setValidationError] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Load data when available
  useEffect(() => {
    if (userTargets) {
      setAnnualIncomeTarget(userTargets.annual_income_target?.toString() || '120000');
      setMonthlyIncomeTarget(userTargets.monthly_income_target?.toString() || '10000');
      setAnnualPoliciesTarget(userTargets.annual_policies_target?.toString() || '100');
      setMonthlyPoliciesTarget(userTargets.monthly_policies_target?.toString() || '9');
      setAvgPremiumTarget(userTargets.avg_premium_target?.toString() || '1500');
      setPersistency13Target(((userTargets.persistency_13_month_target || 0.85) * 100).toString());
    }
  }, [userTargets]);

  const validateForm = (): boolean => {
    // Validate annual income
    const annualIncome = Number(annualIncomeTarget);
    if (isNaN(annualIncome) || annualIncome < 0) {
      setValidationError('Annual income target must be a positive number');
      return false;
    }

    // Validate monthly income
    const monthlyIncome = Number(monthlyIncomeTarget);
    if (isNaN(monthlyIncome) || monthlyIncome < 0) {
      setValidationError('Monthly income target must be a positive number');
      return false;
    }

    // Validate annual policies
    const annualPolicies = Number(annualPoliciesTarget);
    if (isNaN(annualPolicies) || annualPolicies < 0 || !Number.isInteger(annualPolicies)) {
      setValidationError('Annual policies target must be a positive integer');
      return false;
    }

    // Validate monthly policies
    const monthlyPolicies = Number(monthlyPoliciesTarget);
    if (isNaN(monthlyPolicies) || monthlyPolicies < 0 || !Number.isInteger(monthlyPolicies)) {
      setValidationError('Monthly policies target must be a positive integer');
      return false;
    }

    // Validate avg premium
    const avgPremium = Number(avgPremiumTarget);
    if (isNaN(avgPremium) || avgPremium < 0) {
      setValidationError('Average premium target must be a positive number');
      return false;
    }

    // Validate persistency
    const persistency = Number(persistency13Target);
    if (isNaN(persistency) || persistency < 0 || persistency > 100) {
      setValidationError('Persistency target must be between 0 and 100');
      return false;
    }

    setValidationError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuccess(false);

    if (!validateForm()) {
      return;
    }

    try {
      await updateTargets.mutateAsync({
        annual_income_target: Number(annualIncomeTarget),
        monthly_income_target: Number(monthlyIncomeTarget),
        annual_policies_target: parseInt(annualPoliciesTarget, 10),
        monthly_policies_target: parseInt(monthlyPoliciesTarget, 10),
        avg_premium_target: Number(avgPremiumTarget),
        persistency_13_month_target: Number(persistency13Target) / 100,
      });

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      setValidationError('Failed to update targets. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground">
          Loading your goals...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle>Income & Production Goals</CardTitle>
          </div>
          <CardDescription>
            Set your annual and monthly targets for income and production. These goals are used in the
            Analytics dashboard to track your progress.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Income Targets */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Income Targets
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualIncome">Annual Income Goal</Label>
                  <Input
                    id="annualIncome"
                    type="number"
                    value={annualIncomeTarget}
                    onChange={(e) => {
                      setAnnualIncomeTarget(e.target.value);
                      setShowSuccess(false);
                    }}
                    placeholder="120000"
                    step="1000"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target: {formatCurrency(Number(annualIncomeTarget) || 0)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyIncome">Monthly Income Goal</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    value={monthlyIncomeTarget}
                    onChange={(e) => {
                      setMonthlyIncomeTarget(e.target.value);
                      setShowSuccess(false);
                    }}
                    placeholder="10000"
                    step="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target: {formatCurrency(Number(monthlyIncomeTarget) || 0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Production Targets */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Production Targets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualPolicies">Annual Policies Goal</Label>
                  <Input
                    id="annualPolicies"
                    type="number"
                    value={annualPoliciesTarget}
                    onChange={(e) => {
                      setAnnualPoliciesTarget(e.target.value);
                      setShowSuccess(false);
                    }}
                    placeholder="100"
                    step="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of policies to sell this year
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyPolicies">Monthly Policies Goal</Label>
                  <Input
                    id="monthlyPolicies"
                    type="number"
                    value={monthlyPoliciesTarget}
                    onChange={(e) => {
                      setMonthlyPoliciesTarget(e.target.value);
                      setShowSuccess(false);
                    }}
                    placeholder="9"
                    step="1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of policies to sell per month
                  </p>
                </div>
              </div>
            </div>

            {/* Quality Targets */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Quality Targets</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="avgPremium">Average Premium Goal</Label>
                  <Input
                    id="avgPremium"
                    type="number"
                    value={avgPremiumTarget}
                    onChange={(e) => {
                      setAvgPremiumTarget(e.target.value);
                      setShowSuccess(false);
                    }}
                    placeholder="1500"
                    step="50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target avg annual premium: {formatCurrency(Number(avgPremiumTarget) || 0)}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="persistency">13-Month Persistency Goal (%)</Label>
                  <Input
                    id="persistency"
                    type="number"
                    value={persistency13Target}
                    onChange={(e) => {
                      setPersistency13Target(e.target.value);
                      setShowSuccess(false);
                    }}
                    placeholder="85"
                    step="1"
                    min="0"
                    max="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Target retention rate at 13 months: {persistency13Target}%
                  </p>
                </div>
              </div>
            </div>

            {/* Validation Error */}
            {validationError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {validationError}
              </div>
            )}

            {/* Success Message */}
            {showSuccess && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                Goals updated successfully!
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                disabled={updateTargets.isPending}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {updateTargets.isPending ? 'Saving...' : 'Save Goals'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">How Goals Are Used</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong className="text-foreground">Income Goal Tracker:</strong> Your annual income goal
            is displayed in the Analytics dashboard, showing your progress and projecting if you'll
            hit your target.
          </p>
          <p>
            <strong className="text-foreground">Production Metrics:</strong> Policy goals help calculate
            how many policies you need to sell per week/month to stay on track.
          </p>
          <p>
            <strong className="text-foreground">Quality Benchmarks:</strong> Premium and persistency
            targets help you maintain quality while scaling production.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
