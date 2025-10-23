// src/features/dashboard/components/PaceTracker.tsx

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Target, Calendar, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaceTrackerProps {
  policiesNeededPerWeek: number;
  policiesNeededPerMonth: number;
  daysRemainingInQuarter: number;
  daysRemainingInYear: number;
  currentRunRate: number;
  targetRunRate: number;
  averageAP: number;
}

export const PaceTracker: React.FC<PaceTrackerProps> = ({
  policiesNeededPerWeek,
  policiesNeededPerMonth,
  daysRemainingInQuarter,
  daysRemainingInYear,
  currentRunRate,
  targetRunRate,
  averageAP,
}) => {
  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const runRatePercentage = targetRunRate > 0
    ? Math.min(100, (currentRunRate / targetRunRate) * 100)
    : 0;

  const onPace = currentRunRate >= targetRunRate;

  return (
    <Card className="bg-gradient-to-br from-card via-primary/5 to-card mb-6 shadow-xl">
      <CardContent className="p-6">
        {/* Header Section */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-3 rounded-lg bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg">
            <Target size={24} className="text-primary-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground m-0">
              Pace Tracker
            </h3>
            <p className="text-sm text-muted-foreground m-0">
              Goal tracking based on real average AP
            </p>
          </div>
        </div>

        {/* Pace Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
          <Card className="bg-gradient-to-br from-info/20 via-status-earned/15 to-card shadow-md">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
                Policies/Week Needed
              </div>
              <div className="text-4xl font-bold text-info font-mono">
                {policiesNeededPerWeek}
              </div>
              <div className="text-xs text-muted-foreground/80 mt-1">
                To hit annual target
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-success/20 via-status-active/15 to-card shadow-md">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
                Policies/Month Needed
              </div>
              <div className="text-4xl font-bold text-success font-mono">
                {policiesNeededPerMonth}
              </div>
              <div className="text-xs text-muted-foreground/80 mt-1">
                Average monthly goal
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-warning/20 via-status-pending/15 to-card shadow-md">
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
                Average AP
              </div>
              <div className="text-2xl font-bold text-warning font-mono">
                {formatCurrency(averageAP)}
              </div>
              <div className="text-xs text-muted-foreground/80 mt-1">
                From real policy data
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Days Remaining */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
          <Card className="bg-gradient-to-br from-accent/10 to-card shadow-md">
            <CardContent className="p-3 flex items-center gap-3">
              <Calendar size={16} className="text-primary" />
              <div>
                <div className="text-xl font-bold text-foreground">
                  {daysRemainingInQuarter}
                </div>
                <div className="text-xs text-muted-foreground/80 uppercase">
                  Days left (Quarter)
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-accent/10 to-card shadow-md">
            <CardContent className="p-3 flex items-center gap-3">
              <Calendar size={16} className="text-primary" />
              <div>
                <div className="text-xl font-bold text-foreground">
                  {daysRemainingInYear}
                </div>
                <div className="text-xs text-muted-foreground/80 uppercase">
                  Days left (Year)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Run Rate Progress */}
        <Card
          className={cn(
            "shadow-lg",
            onPace
              ? "bg-gradient-to-br from-success/25 via-status-active/15 to-card"
              : "bg-gradient-to-br from-destructive/25 via-error/15 to-card"
          )}
        >
          <CardContent className="p-4">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp size={16} className={onPace ? "text-success" : "text-destructive"} />
                <span className="text-sm text-foreground font-semibold uppercase tracking-wide">
                  Current Run Rate
                </span>
              </div>
              <span className="text-sm text-foreground font-bold">
                {runRatePercentage.toFixed(0)}%
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-muted/50 rounded-md overflow-hidden shadow-inner mb-3">
              <div
                className={cn(
                  "h-full rounded-md transition-all duration-300",
                  onPace
                    ? "bg-gradient-to-r from-success via-status-active to-success/80"
                    : "bg-gradient-to-r from-destructive via-error to-destructive/80"
                )}
                style={{ width: `${runRatePercentage}%` }}
              />
            </div>

            {/* Run Rate Stats */}
            <div className="flex justify-between text-xs">
              <div>
                <span className="text-muted-foreground/80">Current: </span>
                <span className="text-foreground font-bold font-mono">
                  {formatCurrency(currentRunRate)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground/80">Target: </span>
                <span className="text-foreground font-bold font-mono">
                  {formatCurrency(targetRunRate)}
                </span>
              </div>
            </div>

            {/* Status Messages */}
            {!onPace && (
              <div className="mt-3 px-3 py-2 rounded-md bg-destructive/20 shadow-sm text-xs text-destructive font-medium">
                📉 You're behind pace. Need to increase production to hit target.
              </div>
            )}

            {onPace && (
              <div className="mt-3 px-3 py-2 rounded-md bg-success/20 shadow-sm text-xs text-success font-medium">
                ✓ You're on pace to exceed your annual target!
              </div>
            )}
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};
