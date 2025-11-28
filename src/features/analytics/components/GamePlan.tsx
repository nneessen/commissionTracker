// src/features/analytics/components/GamePlan.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, DollarSign, TrendingUp, Trophy, Phone, Flame, CheckCircle2 } from 'lucide-react';
import { useAnalyticsData } from '../../../hooks';
import { useUserTargets } from '../../../hooks/targets/useUserTargets';
import { useExpenses } from '../../../hooks/expenses/useExpenses';
import { gamePlanService } from '../../../services/analytics/gamePlanService';
import { cn } from '@/lib/utils';

/**
 * GamePlan - Shows what you need to do to hit your target
 *
 * Actionable, easy-to-understand game plan with:
 * - Progress to goal (using REAL user targets from database)
 * - Multiple path options
 * - Smart recommendations
 * - What-if scenarios
 * - Proper MTD (month-to-date) calculations
 */
export function GamePlan() {
  // Fetch all policies and commissions
  const { raw, isLoading: isAnalyticsLoading } = useAnalyticsData({
    startDate: new Date(2020, 0, 1), // Get all data for filtering
    endDate: new Date(2030, 11, 31),
  });

  // Fetch user's actual targets from database
  const { data: userTargets, isLoading: isTargetsLoading } = useUserTargets();

  // Fetch expenses for MTD calculation
  const { data: allExpenses, isLoading: isExpensesLoading } = useExpenses();

  const isLoading = isAnalyticsLoading || isTargetsLoading || isExpensesLoading;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-muted-foreground text-xs">
          Loading your game plan...
        </CardContent>
      </Card>
    );
  }

  // Calculate MTD expenses (current month only)
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const mtdExpenses = (allExpenses || [])
    .filter((e) => {
      const expenseDate = new Date(e.date);
      return expenseDate >= monthStart && expenseDate <= monthEnd;
    })
    .reduce((sum, e) => sum + e.amount, 0);

  // Calculate game plan using REAL data
  const gamePlan = gamePlanService.calculateGamePlan(
    raw.policies,
    raw.commissions,
    userTargets || null,
    mtdExpenses
  );

  // Calculate annual progress
  const annualProgress = gamePlanService.calculateAnnualProgress(
    raw.policies,
    raw.commissions,
    userTargets || null
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getUrgencyColor = (urgency: 'high' | 'medium' | 'low') => {
    switch (urgency) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-success';
    }
  };

  const getMoveIcon = (icon: string) => {
    switch (icon) {
      case 'trophy': return <Trophy className="h-5 w-5" />;
      case 'phone': return <Phone className="h-5 w-5" />;
      case 'fire': return <Flame className="h-5 w-5" />;
      default: return <Target className="h-5 w-5" />;
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-5">
          <div className="text-sm font-semibold text-foreground uppercase tracking-wide">
            Your Game Plan
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            What you need to do to hit your target for {gamePlan.currentMonth}
          </div>
        </div>

        {/* Annual Goal Tracker */}
        <div className="mb-5 p-4 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/20">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Annual Goal Tracker
          </div>

          {/* YTD Progress Bar */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Year-to-Date Progress</span>
              <span className="text-xs font-bold text-foreground font-mono">
                {Math.round(annualProgress.progressPercent)}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  annualProgress.onTrackForYear
                    ? "bg-gradient-to-r from-success to-success/80"
                    : "bg-gradient-to-r from-amber-500 to-amber-600"
                )}
                style={{ width: `${Math.min(100, annualProgress.progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 bg-background/50 rounded text-center">
              <div className="text-[10px] text-muted-foreground">Annual Goal</div>
              <div className="text-sm font-bold text-foreground font-mono">
                {formatCurrency(annualProgress.annualGoal)}
              </div>
            </div>
            <div className="p-2 bg-background/50 rounded text-center">
              <div className="text-[10px] text-muted-foreground">YTD Earned</div>
              <div className="text-sm font-bold text-success font-mono">
                {formatCurrency(annualProgress.ytdCommissions)}
              </div>
            </div>
            <div className="p-2 bg-background/50 rounded text-center">
              <div className="text-[10px] text-muted-foreground">Remaining</div>
              <div className="text-sm font-bold text-destructive font-mono">
                {formatCurrency(annualProgress.remainingNeeded)}
              </div>
            </div>
            <div className="p-2 bg-background/50 rounded text-center">
              <div className="text-[10px] text-muted-foreground">Months Left</div>
              <div className="text-sm font-bold text-foreground font-mono">
                {annualProgress.monthsRemaining}
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">
                  Monthly Average Needed
                </div>
                <div className="text-lg font-bold text-foreground font-mono">
                  {formatCurrency(annualProgress.avgMonthlyNeeded)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1">
                  Policies Per Month
                </div>
                <div className="text-lg font-bold text-primary font-mono">
                  ~{annualProgress.policiesNeededPerMonth}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  based on avg ${Math.round(annualProgress.avgCommissionPerPolicy).toLocaleString()} commission
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="mb-5">
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground">Progress to Goal</span>
            <span className="text-xs font-bold text-foreground font-mono">
              {Math.round(gamePlan.progressPercent)}%
            </span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className={cn(
                "h-full transition-all duration-300 rounded-full",
                gamePlan.isOnTrack
                  ? "bg-gradient-to-r from-success to-success/80"
                  : "bg-gradient-to-r from-warning to-destructive"
              )}
              style={{ width: `${Math.min(100, gamePlan.progressPercent)}%` }}
            />
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-[10px] text-muted-foreground">MTD Earned</div>
              <div className="text-sm font-bold text-foreground font-mono">
                {formatCurrency(gamePlan.mtdCommissions)}
              </div>
            </div>
            <div className="p-2 bg-primary/10 rounded">
              <div className="text-[10px] text-muted-foreground">Goal (Gross)</div>
              <div className="text-sm font-bold text-foreground font-mono">
                {formatCurrency(gamePlan.grossCommissionNeeded)}
              </div>
            </div>
            <div className="p-2 bg-muted/30 rounded">
              <div className="text-[10px] text-muted-foreground">Need</div>
              <div className="text-sm font-bold text-destructive font-mono">
                {formatCurrency(gamePlan.gap)}
              </div>
            </div>
          </div>

          {/* Time Remaining */}
          <div className="mt-3 p-2 bg-warning/10 rounded text-center border border-warning/30">
            <span className="text-xs font-semibold text-warning">
              ⏰ {gamePlan.daysRemainingInMonth} days left in {gamePlan.currentMonth}
            </span>
          </div>

          {/* Breakdown Note */}
          <div className="mt-3 p-2 bg-muted/20 rounded text-[10px] text-muted-foreground">
            <strong>Goal breakdown:</strong> ${formatCurrency(gamePlan.monthlyIncomeTarget)} income + ${formatCurrency(gamePlan.monthlyExpenseTarget)} expenses = ${formatCurrency(gamePlan.grossCommissionNeeded)} total commission needed
          </div>
        </div>

        {/* Path to Goal */}
        {gamePlan.gap > 0 && (
          <div className="mb-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Choose Your Path
            </div>
            <div className="grid grid-cols-1 gap-2">
              {gamePlan.pathOptions.map((option) => (
                <Card
                  key={option.id}
                  className="bg-gradient-to-r from-primary/10 to-accent/5 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                >
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {option.icon === 'dollar' && <DollarSign className="h-5 w-5 text-primary" />}
                      {option.icon === 'policy' && <Target className="h-5 w-5 text-success" />}
                      {option.icon === 'mixed' && <TrendingUp className="h-5 w-5 text-info" />}
                      {option.icon === 'trophy' && <Trophy className="h-5 w-5 text-warning" />}
                      <div>
                        <div className="text-xs font-semibold text-foreground">{option.label}</div>
                        <div className="text-[10px] text-muted-foreground">{option.description}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-foreground font-mono">
                      {option.target}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Smart Moves */}
        {gamePlan.smartMoves.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Smart Moves
            </div>
            <div className="space-y-2">
              {gamePlan.smartMoves.map((move) => (
                <div
                  key={move.id}
                  className="p-3 bg-muted/20 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("mt-0.5", getUrgencyColor(move.urgency))}>
                      {getMoveIcon(move.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-foreground mb-1">
                        {move.title}
                      </div>
                      <div className="text-[10px] text-muted-foreground mb-1">
                        {move.description}
                      </div>
                      <div className="text-[10px] text-muted-foreground italic">
                        💡 {move.reason}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What-If Scenarios */}
        <div className="mb-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            What If...
          </div>
          <div className="space-y-2">
            {gamePlan.scenarios.map((scenario) => {
              const isGood = scenario.goalPercent >= 100;
              const isClose = scenario.goalPercent >= 90;

              return (
                <div
                  key={scenario.id}
                  className={cn(
                    "p-3 rounded-lg border flex items-center justify-between",
                    isGood ? "bg-success/10 border-success/30" :
                    isClose ? "bg-warning/10 border-warning/30" :
                    "bg-muted/20 border-border"
                  )}
                >
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      {scenario.condition}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {formatCurrency(scenario.projectedEarnings)} total
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "text-sm font-bold font-mono",
                      isGood ? "text-success" :
                      isClose ? "text-warning" :
                      "text-muted-foreground"
                    )}>
                      {Math.round(scenario.goalPercent)}%
                    </div>
                    {isGood && <CheckCircle2 className="h-4 w-4 text-success ml-auto mt-0.5" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Encouragement Footer */}
        {gamePlan.gap > 0 ? (
          <div className="p-3 bg-gradient-to-r from-primary/10 to-accent/5 rounded-lg text-center">
            <div className="text-xs font-semibold text-foreground">
              {gamePlan.isOnTrack ? "You got this! 💪" : "Time to push! Every sale counts 🔥"}
            </div>
          </div>
        ) : (
          <div className="p-3 bg-gradient-to-r from-success/10 to-success/5 rounded-lg text-center border border-success/30">
            <div className="text-xs font-semibold text-success">
              🎉 Goal Achieved! Keep the momentum going!
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
