# Commission Tracker Dashboard Fix - Continuation Prompt

## Current State
- **Codebase**: Reverted to commit `ff76089` (last known working state)
- **Database**: Remote Supabase instance `pcyaqwodnyrpkaiojnpz`
- **System Date**: November 1, 2025
- **Data Date**: All from 2024 (causing date filtering issues)
- **Dev Server**: Running on localhost:3000

## What Was Done
1. Reverted problematic commission rate calculation commit that broke dashboard
2. Temporarily disabled date filtering in `/src/hooks/useMetricsWithDateRange.ts` (lines 117-151)
   - Changed `filteredCommissions`, `filteredExpenses`, `filteredPolicies` to return ALL data instead of filtering by date
   - This made dashboard show data again but breaks time period filtering

## Current Issues to Fix

### Issue 1: Commission Calculation Discrepancy
- **Problem**: Dashboard shows $817 pending pipeline, but policies table shows correct $743
- **Location**: The calculation error is in `/src/hooks/useMetricsWithDateRange.ts` lines 380-383:
  ```javascript
  // ✅ FIXED: Pending pipeline - all commissions not yet paid (pending + earned statuses)
  const pendingPipeline = commissions
    .filter(c => c.status === 'pending' || c.status === 'earned')
    .reduce((sum, c) => sum + (c.amount || 0), 0);
  ```
- **Issue**: This calculates from ALL commissions, not matching what policies table shows
- **Test Case**: 1 policy with pending commission shows $743 in policies table (correct) but $817 in dashboard (wrong)
- **Likely Cause**: The pendingPipeline is summing something incorrectly or including wrong commissions

### Issue 2: Premium Column Label
- **Problem**: Policies table shows "Monthly" label under Annual Premium column
- **Location**: `/src/features/policies/` components
- **Fix**: Change label from "monthly" to "annual"

### Issue 3: Date Filtering Broken
- **Problem**: All data is from 2024 but system date is 2025, causing filtering to show 0 results
- **Current Fix**: Disabled all date filtering (temporary hack)
- **Proper Fix Options**:
  1. Update all data dates to 2025 in database
  2. OR fix date filtering logic to handle year differences
  3. OR use relative date ranges instead of absolute

## Database Info
- 11 total policies (10 active, 1 pending)
- 11 commissions total
- 2 expenses
- Data exists and is accessible (RLS is not the issue)

## Key Files to Check
```
/src/hooks/useMetricsWithDateRange.ts (lines 369-371 for pendingPipeline)
/src/features/dashboard/DashboardHome.tsx
/src/features/policies/PolicyList.tsx (or similar for table display)
/src/services/commissions/commissionService.ts
/src/utils/dateRange.ts
```

## Console Output Shows
- Data IS loading: `Total commissions from DB: 11`
- But filtered to 0: `Filtered commissions for period: 0`
- When filtering disabled: Shows all data but breaks time periods

## What Needs to Be Done

1. **Fix Commission Calculation**
   - Find why dashboard calculates $817 but table shows correct $743
   - Check `pendingPipeline` calculation in `useMetricsWithDateRange.ts`
   - Ensure both dashboard and policies table use same calculation

2. **Fix Premium Label**
   - Change "monthly" to "annual" in policies table header

3. **Fix Date Filtering Properly**
   - Either update data to 2025 or fix filtering logic
   - Re-enable proper date filtering after fix

## Commands to Start
```bash
cd ~/projects/commissionTracker
git status  # Should be on commit ff76089
npm start   # Dev server
```

## Important Context
- This was working perfectly before the targets page work
- The problematic commit was about commission rate calculations for targets
- That migration broke the dashboard even though it wasn't related
- Code is reverted but date filtering is still broken

## Expected Outcome
1. Dashboard pending pipeline shows $743 (matching policies table)
2. Premium column labeled "annual" not "monthly"
3. Date filtering works properly for November 2025 system date with 2024 data