# CRITICAL: Fix Commission Amount Calculation

## Status: IN PROGRESS - Resume Immediately

## The Actual Problem

**WRONG**: I fixed date filtering, but that's NOT the issue.

**ACTUAL ISSUE**: The commission AMOUNT being displayed is wrong.
- User has 2 policies with **9-month advances** totaling **$1758** (CORRECT)
- System displays **$2233** (WRONG)
- The $2233 appears to be the **full 12-month commission** (100%)
- The $1758 is the **9-month advance** (75% of annual)

The system is incorrectly including months 10, 11, 12 (the "as-earned" portion that hasn't been paid yet) in the displayed totals.

## Root Cause to Investigate

The `amount` field in commissions might represent different things:
1. `amount` = full annual commission value (what it seems to be showing - WRONG for advances)
2. `advance_amount` = the 9-month advance portion (what should be shown)
3. `earned_amount` = portion earned so far

### Key Questions to Answer:
1. What value is stored in `commissions.amount` in the database?
2. Is $2233 the full 12-month value and $1758 the 9-month advance?
3. Are components using `amount` when they should use `advance_amount` or a calculated value?

## Files to Investigate

1. **CommissionRepository.ts** (`src/services/commissions/CommissionRepository.ts`)
   - Lines 68-73: `transformFromDB` - how is `amount` mapped?
   - Does it use `amount`, `commission_amount`, or `advance_amount`?

2. **Database schema** - Check what's actually stored:
   ```sql
   SELECT amount, advance_amount, earned_amount, advance_months
   FROM commissions
   WHERE user_id = '<user_id>' AND status = 'paid';
   ```

3. **Commission creation logic** - Where are these values set?
   - `CommissionLifecycleService.ts`
   - `CommissionCalculationService.ts`

## Likely Fix

For PAID commissions that are advances:
- Display `advance_amount` (the 9-month advance: $1758)
- NOT `amount` (the full 12-month value: $2233)

OR the `amount` field should already contain the advance value, not the full value.

## Calculation Math

If annual commission = $2233:
- 9-month advance (75%) = $2233 × 0.75 = $1674.75 ≈ NOT $1758

So either:
- The advance percentage is different (e.g., 78.7% = $1758)
- Or there are 2 policies with different values adding up to $1758

Need to query actual database values to understand the discrepancy.

## Next Steps

1. **Query the database** to see actual values:
   ```sql
   SELECT id, policy_id, amount, advance_amount, earned_amount,
          advance_months, status, type
   FROM commissions
   WHERE user_id = (SELECT id FROM users WHERE email = 'nickneessen@thestandardhq.com')
   AND status = 'paid';
   ```

2. **Compare with policies table** to understand the commission structure

3. **Trace the display path** - from DB → Repository → Service → Hook → UI
   - Specifically check what field is being used for display

4. **Fix the source** - either:
   - Fix the Repository transform to use correct field
   - OR fix the calculation that stores the value

## Files Changed in Previous Session (Already Committed?)

These changes were made but may NOT fix the actual problem:
- `src/hooks/targets/useActualMetrics.ts` - changed `.earned` → `.paid`
- `src/services/analytics/gamePlanService.ts` - fixed date filtering
- `src/services/reports/reportGenerationService.ts` - fixed date filtering

## Priority

**CRITICAL** - Production app showing wrong values to users.

The fix is likely a one-line change once we identify which field should be displayed, but we need to understand the data model first.
