# Time Period Filter - Complete Implementation Plan

**Date:** 2025-10-09
**Status:** Active
**Priority:** HIGH

---

## Problem Statement

The dashboard has a time period switcher (Daily/Weekly/Monthly/Yearly) but switching between periods does NOT recalculate metrics. The current implementation only filters raw data locally but doesn't recalculate the complex metrics from the `useMetrics` hook, which continues to calculate everything over ALL data.

## Solution Overview

Create a new `useMetricsWithDateRange` hook that properly filters data and recalculates all metrics based on the selected time period. This will ensure all dashboard metrics update correctly when switching periods.

---

## Date Range Definitions

### Time Period Logic

| Period | Start | End | Example (Oct 9, 2025 3PM) |
|--------|-------|-----|---------------------------|
| **Daily** | Today 00:00:00 | Now | Oct 9 00:00 → Oct 9 15:00 |
| **Weekly** | 7 days ago | Now | Oct 2 15:00 → Oct 9 15:00 |
| **Monthly** | 1st of month 00:00 | Now | Oct 1 00:00 → Oct 9 15:00 |
| **Yearly** | Jan 1 00:00 | Now | Jan 1 2025 00:00 → Oct 9 15:00 |

### Date Fields for Filtering

**Commissions:**
- Primary: `paidDate` (for paid commissions)
- Fallback: `createdAt` (for pending commissions)

**Expenses:**
- Primary: `expense_date`

**Policies:**
- New policies: `createdAt` or `effective_date`
- Premium calculations: `effective_date`
- Active count: Check if active during period

**Clients:**
- New clients: First policy `createdAt` in period
- Total clients: Distinct count from filtered policies

---

## Metrics Classification

### Period-Filtered Metrics (Change with time period)

**Financial:**
- Commission earned in period
- Expenses in period
- Surplus/deficit for period
- Average commission rate for period

**Activity:**
- New policies written in period
- New clients acquired in period
- Premium written in period
- Policies cancelled/lapsed in period

**Performance:**
- Commission by carrier/product/state (period)
- Top performers in period
- Growth rate for period

### Point-in-Time Metrics (Current state - don't change)

**Portfolio:**
- Total active policies (now)
- Total clients (lifetime)
- Pending commission pipeline (now)
- Policy status breakdown (now)

**Rates:**
- Overall retention rate
- Overall average premium
- Overall average commission rate

---

## Implementation Architecture

### 1. Date Utility Functions
**File:** `src/utils/dateRange.ts`

```typescript
export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function getDateRange(period: TimePeriod): DateRange
export function isInDateRange(date: Date, range: DateRange): boolean
export function getDaysInPeriod(period: TimePeriod): number
export function getTimeRemaining(period: TimePeriod): { days: number; hours: number }
```

### 2. New Hook: useMetricsWithDateRange
**File:** `src/hooks/useMetricsWithDateRange.ts`

```typescript
interface UseMetricsWithDateRangeOptions {
  timePeriod: TimePeriod;
  enabled?: boolean;
}

interface DateFilteredMetrics {
  // Period metrics
  periodCommissions: {
    earned: number;
    pending: number;
    byCarrier: Record<string, number>;
    byProduct: Record<string, number>;
    averageRate: number;
  };

  periodExpenses: {
    total: number;
    byCategory: Record<string, number>;
    recurring: number;
  };

  periodPolicies: {
    newCount: number;
    premiumWritten: number;
    averagePremium: number;
    cancelled: number;
    lapsed: number;
  };

  periodClients: {
    newCount: number;
    averageAge: number;
    byState: Record<string, number>;
  };

  // Point-in-time metrics (unfiltered)
  currentState: {
    activePolicies: number;
    totalClients: number;
    pendingPipeline: number;
    retentionRate: number;
  };

  // Calculated metrics
  periodAnalytics: {
    surplusDeficit: number;
    breakevenNeeded: number;
    policiesNeeded: number;
    paceMetrics: {
      dailyTarget: number;
      weeklyTarget: number;
      monthlyTarget: number;
    };
  };
}
```

### 3. Core Calculation Logic

#### Commission Filtering
```typescript
const filterCommissions = (commissions: Commission[], range: DateRange) => {
  return commissions.filter(c => {
    const dateToCheck = c.status === 'paid' && c.paidDate
      ? new Date(c.paidDate)
      : new Date(c.createdAt);
    return isInDateRange(dateToCheck, range);
  });
};
```

#### Breakeven Calculation
```typescript
const calculateBreakeven = (periodExpenses: number, periodCommission: number) => {
  const deficit = periodExpenses - periodCommission;
  return deficit > 0 ? deficit : 0;
};
```

#### Pace Metrics Calculation
```typescript
const calculatePaceMetrics = (
  breakeven: number,
  period: TimePeriod,
  avgPremium: number,
  avgCommissionRate: number
) => {
  const timeRemaining = getTimeRemaining(period);
  const avgCommissionPerPolicy = avgPremium * avgCommissionRate;

  if (avgCommissionPerPolicy === 0) return { daily: 0, weekly: 0, monthly: 0 };

  const policiesNeeded = breakeven / avgCommissionPerPolicy;

  switch(period) {
    case 'daily':
      return {
        daily: policiesNeeded, // Need this many today
        weekly: 0,
        monthly: 0
      };
    case 'weekly':
      return {
        daily: policiesNeeded / timeRemaining.days,
        weekly: policiesNeeded,
        monthly: 0
      };
    case 'monthly':
      return {
        daily: policiesNeeded / timeRemaining.days,
        weekly: (policiesNeeded / timeRemaining.days) * 7,
        monthly: policiesNeeded
      };
    case 'yearly':
      const monthsRemaining = 12 - new Date().getMonth();
      return {
        daily: policiesNeeded / timeRemaining.days,
        weekly: (policiesNeeded / timeRemaining.days) * 7,
        monthly: policiesNeeded / monthsRemaining
      };
  }
};
```

---

## Dashboard Integration

### Update DashboardHome.tsx

1. **Remove redundant local filtering**
2. **Use new hook:**
```typescript
const {
  periodCommissions,
  periodExpenses,
  periodPolicies,
  periodClients,
  currentState,
  periodAnalytics
} = useMetricsWithDateRange({ timePeriod });
```

3. **Update metric displays:**
```typescript
// Financial metrics
const ytdCommission = periodCommissions.earned;
const totalExpenses = periodExpenses.total;
const surplusDeficit = periodAnalytics.surplusDeficit;

// Policy metrics
const activePolicies = currentState.activePolicies; // Point-in-time
const newPolicies = periodPolicies.newCount; // Period-filtered

// Pace metrics
const policiesPerDay = periodAnalytics.paceMetrics.dailyTarget;
```

---

## Testing Strategy

### Unit Tests
**File:** `src/hooks/useMetricsWithDateRange.test.ts`

1. **Date Range Tests**
   - Verify correct start/end for each period
   - Test timezone handling
   - Test month/year boundaries

2. **Filtering Tests**
   - Verify only in-range data included
   - Test edge cases (data at exact boundaries)
   - Test empty periods

3. **Calculation Tests**
   - Verify math accuracy
   - Test with zero/negative values
   - Test division by zero handling

### Integration Tests

1. **Dashboard Updates**
   - Switch periods and verify all metrics update
   - Verify labels change appropriately
   - Check loading states

2. **Performance Tests**
   - Measure query time with filtering
   - Check re-render frequency
   - Verify memoization works

### Manual Testing Checklist

- [ ] Daily view shows today's data only
- [ ] Weekly view shows last 7 days
- [ ] Monthly view shows current month to date
- [ ] Yearly view shows YTD
- [ ] All financial metrics recalculate
- [ ] Pace metrics adjust to period
- [ ] Point-in-time metrics stay constant
- [ ] No console errors
- [ ] Smooth transitions between periods

---

## Implementation Steps

1. **Create Date Utilities** (30 min)
   - Implement getDateRange function
   - Add date comparison helpers
   - Write unit tests

2. **Build useMetricsWithDateRange Hook** (2 hours)
   - Set up hook structure
   - Implement data fetching
   - Add filtering logic
   - Calculate period metrics
   - Calculate point-in-time metrics
   - Add derived calculations

3. **Update Dashboard** (1 hour)
   - Remove redundant code
   - Integrate new hook
   - Update metric bindings
   - Fix label generation

4. **Testing** (1 hour)
   - Write unit tests
   - Run integration tests
   - Manual verification
   - Fix any issues

5. **Optimization** (30 min)
   - Add memoization
   - Optimize queries
   - Check performance

---

## Success Criteria

✅ All metrics update when switching time periods
✅ Daily shows today only
✅ Weekly shows rolling 7 days
✅ Monthly shows current month to date
✅ Yearly shows YTD
✅ Calculations are mathematically correct
✅ No performance degradation
✅ Clean, maintainable code
✅ Comprehensive test coverage
✅ All TypeScript types correct

---

## Risk Mitigation

**Risk:** Performance degradation with filtering
**Mitigation:** Use React Query caching, memoize calculations

**Risk:** Incorrect date handling across timezones
**Mitigation:** Always use UTC for calculations, display in local time

**Risk:** Division by zero in calculations
**Mitigation:** Add guards, return sensible defaults

**Risk:** Breaking existing functionality
**Mitigation:** Keep old hook, incrementally migrate

---

## Notes

- Follow SOLID principles and project guidelines
- Keep functions pure for testability
- Use descriptive variable names
- Comment complex calculations
- No local storage - all from Supabase
- Test edge cases thoroughly

---

## Progress Tracking

- [ ] Date utilities created
- [ ] useMetricsWithDateRange hook implemented
- [ ] Commission filtering working
- [ ] Expense filtering working
- [ ] Policy filtering working
- [ ] Client filtering working
- [ ] Breakeven calculation correct
- [ ] Pace metrics accurate
- [ ] Dashboard integrated
- [ ] Tests written and passing
- [ ] TypeScript checks pass
- [ ] Manual testing complete
- [ ] Documentation updated