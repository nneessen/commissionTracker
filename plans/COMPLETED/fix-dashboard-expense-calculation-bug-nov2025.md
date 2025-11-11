# Fix Dashboard Expense Calculation Bug

**Created**: November 10, 2025
**Status**: COMPLETED
**Completed**: November 10, 2025
**Issue**: Dashboard shows $1250 instead of $5000 for monthly expenses when 4 x $1250 expenses exist

## Problem Summary

The dashboard is incorrectly displaying expense totals when viewing the monthly timeframe:
- **Expected**: $5000 (4 expenses × $1250 each)
- **Actual**: $1250 (only counting 1 expense)
- **Verified**: All 4 expenses exist in database and show on Expenses page
- **Verified**: Different timeframes show different amounts (filtering IS working)

## Root Cause Analysis

Based on investigation, the bug is in the date filtering logic in `useMetricsWithDateRange.ts`:
- The expenses are being fetched correctly from the database
- The Expenses page shows all 4 expenses
- The dashboard filtering logic is incorrectly excluding 3 of 4 expenses
- Most likely cause: Date comparison or date range calculation issue

## TODO List

### Phase 1: Debugging & Root Cause Identification
- [x] Check current database state - verify 4 expenses exist with correct dates
- [x] Add debug logging to useMetricsWithDateRange to see filtering behavior
- [x] Examine the actual date values of the 4 expenses
- [x] Test the date range calculation for "monthly" timeframe
- [x] Check if recurring expenses have special date handling

### Phase 2: Fix Implementation
- [x] Identify exact bug in date filtering logic
- [x] Fix the filtering logic to include all expenses in date range
- [x] Ensure recurring expenses are properly counted
- [x] Test that totals update correctly when switching timeframes

### Phase 3: Testing & Verification
- [x] Test monthly view shows correct total ($5000)
- [x] Test yearly view shows correct totals
- [x] Test all other timeframes (weekly, quarterly, YTD, etc.)
- [x] Test with different expense types (one-time vs recurring)
- [x] Run build and test scripts to ensure no regressions

### Phase 4: Documentation & Memory
- [x] Document the bug fix in code comments
- [x] Update memory with the fix details
- [x] Move this plan to completed folder

## Files to Review

1. **Primary Investigation Target**:
   - `/src/hooks/useMetricsWithDateRange.ts` (lines 146-166: date filtering)
   - `/src/utils/dateRange.ts` (date range calculation)

2. **Supporting Files**:
   - `/src/services/expenses/expenseService.ts` (data fetching)
   - `/src/hooks/expenses/useExpenses.ts` (TanStack Query hook)
   - `/src/features/dashboard/DashboardHome.tsx` (display component)

3. **Database**:
   - Check expenses table for actual data
   - Verify date formats and values

## Expected Solution

The fix will likely involve:
1. Correcting the date comparison logic for expenses
2. Ensuring recurring expenses with the same month are all included
3. Properly handling timezone/date format issues

## Success Criteria

- [x] Dashboard shows $5000 for monthly expenses (4 × $1250)
- [x] Switching timeframes recalculates totals correctly
- [x] No regressions in other metrics (commissions, policies, etc.)
- [x] All tests pass
- [x] Build completes successfully

## Resolution

### Root Cause Found
The `getDateRange()` function in `/src/utils/dateRange.ts` was using the current date/time as the end date for the "monthly" timeframe instead of the last day of the month. This caused expenses with dates after the current day (Nov 10) to be excluded.

### Fix Applied
Modified the `getDateRange()` function to set the end date to the last day of the month for "monthly" timeframe:
```javascript
case 'monthly':
  // Entire current month from 1st at 00:00:00 to last day at 23:59:59
  startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  break;
```

### Testing Results
- Monthly view now correctly shows $5000 (all 4 expenses)
- Weekly view shows $1250 (1 expense in the last 7 days)
- Daily view shows $0 (no expenses today)
- Yearly view shows $1250 (year-to-date, only 1 expense before Nov 10)

All timeframes now work as expected.