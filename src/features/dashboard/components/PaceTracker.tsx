// src/features/dashboard/components/PaceTracker.tsx

import React from 'react';
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

/**
 * Pace Tracker Component
 *
 * Displays goal tracking metrics based on real average annual premium data.
 * Refactored to use Tailwind CSS classes instead of inline styles.
 */
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
    <div className="bg-gradient-to-br from-card to-muted/20 rounded-lg p-6 shadow-md mb-6">
      {/* Header Section */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-3 rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-md">
          <Target size={24} className="text-card" />
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
        {/* Policies/Week Needed */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 shadow-sm">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
            Policies/Week Needed
          </div>
          <div className="text-4xl font-bold text-foreground font-mono">
            {policiesNeededPerWeek}
          </div>
          <div className="text-xs text-muted-foreground/80 mt-1">
            To hit annual target
          </div>
        </div>

        {/* Policies/Month Needed */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 shadow-sm">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
            Policies/Month Needed
          </div>
          <div className="text-4xl font-bold text-foreground font-mono">
            {policiesNeededPerMonth}
          </div>
          <div className="text-xs text-muted-foreground/80 mt-1">
            Average monthly goal
          </div>
        </div>

        {/* Average AP */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 shadow-sm">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">
            Average AP
          </div>
          <div className="text-2xl font-bold text-foreground font-mono">
            {formatCurrency(averageAP)}
          </div>
          <div className="text-xs text-muted-foreground/80 mt-1">
            From real policy data
          </div>
        </div>
      </div>

      {/* Days Remaining */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {/* Quarter Days */}
        <div className="p-3 rounded-md bg-gradient-to-br from-muted/20 to-muted/50 shadow-sm flex items-center gap-3">
          <Calendar size={16} className="text-foreground" />
          <div>
            <div className="text-xl font-bold text-foreground">
              {daysRemainingInQuarter}
            </div>
            <div className="text-xs text-muted-foreground/80 uppercase">
              Days left (Quarter)
            </div>
          </div>
        </div>

        {/* Year Days */}
        <div className="p-3 rounded-md bg-gradient-to-br from-muted/20 to-muted/50 shadow-sm flex items-center gap-3">
          <Calendar size={16} className="text-foreground" />
          <div>
            <div className="text-xl font-bold text-foreground">
              {daysRemainingInYear}
            </div>
            <div className="text-xs text-muted-foreground/80 uppercase">
              Days left (Year)
            </div>
          </div>
        </div>
      </div>

      {/* Run Rate Progress */}
      <div
        className={cn(
          "p-4 rounded-lg shadow-sm",
          onPace
            ? "bg-gradient-to-br from-green-50 to-green-100"
            : "bg-gradient-to-br from-red-50 to-red-100"
        )}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className={onPace ? "text-green-700" : "text-red-700"} />
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
                ? "bg-gradient-to-r from-green-700 to-green-600"
                : "bg-gradient-to-r from-red-600 to-red-500"
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
          <div className="mt-3 px-3 py-2 rounded-md bg-red-700/10 border border-red-600 text-xs text-red-700 font-medium">
            📉 You're behind pace. Need to increase production to hit target.
          </div>
        )}

        {onPace && (
          <div className="mt-3 px-3 py-2 rounded-md bg-green-700/10 border border-green-600 text-xs text-green-700 font-medium">
            ✓ You're on pace to exceed your annual target!
          </div>
        )}
      </div>
    </div>
  );
};
