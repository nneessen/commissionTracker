-- Migration: Document Targets Page Redesign
-- Date: October 31, 2025
-- Purpose: Document the redesign of the targets page to use intelligent auto-calculations

/*
TARGETS PAGE REDESIGN DOCUMENTATION
====================================

Overview:
---------
The targets page has been completely redesigned to be more intelligent and user-friendly.
Instead of requiring users to manually input 7+ different targets, the system now only
requires ONE input: the annual income target. Everything else is auto-calculated.

Key Changes:
------------
1. SINGLE INPUT: Only annual_income_target is required from user
2. AUTO-CALCULATION: All other metrics are derived from:
   - User's historical average commission rate
   - User's historical average policy premium
   - User's historical expense patterns
   - Industry defaults when no historical data exists

3. REMOVED DUPLICATE FIELDS:
   - Removed target1 and target2 from constants table (were in settings)
   - Consolidated all target-related functionality in the targets page

How It Works:
-------------
1. User inputs their annual commission income target (e.g., $400,000)
2. System calculates average commission rate from historical data (e.g., 50%)
3. Calculates total premium needed: $400,000 / 0.50 = $800,000
4. Uses average policy premium from history (e.g., $2,000)
5. Calculates policies needed: $800,000 / $2,000 = 400 policies/year
6. Breaks down by time period: quarterly, monthly, weekly, daily

Database Schema Notes:
----------------------
The user_targets table structure remains the same for backward compatibility,
but the application now:
- Auto-calculates all fields except annual_income_target
- Shows calculation transparency to users
- Allows manual override if needed via settings

UI Improvements:
----------------
- Welcome dialog for first-time users
- MetricTooltip on every metric explaining calculations
- CalculationBreakdown component showing the math
- Confidence indicators based on data quality
- Warnings when targets seem unrealistic

This migration doesn't change the schema but documents the significant
application-level changes for future reference.
*/

-- Add comment to user_targets table documenting the new approach
COMMENT ON TABLE public.user_targets IS
'User income and policy targets. As of Oct 2025, only annual_income_target is user-input; all other fields are auto-calculated from historical data.';

COMMENT ON COLUMN public.user_targets.annual_income_target IS
'Primary user input - their annual commission income goal. All other metrics derive from this.';

COMMENT ON COLUMN public.user_targets.monthly_income_target IS
'Auto-calculated: annual_income_target / 12';

COMMENT ON COLUMN public.user_targets.quarterly_income_target IS
'Auto-calculated: annual_income_target / 4';

COMMENT ON COLUMN public.user_targets.annual_policies_target IS
'Auto-calculated: (annual_income_target / avg_commission_rate) / avg_policy_premium';

COMMENT ON COLUMN public.user_targets.monthly_policies_target IS
'Auto-calculated: annual_policies_target / 12';

COMMENT ON COLUMN public.user_targets.avg_premium_target IS
'Auto-calculated from historical policy data or defaults to $2000';

COMMENT ON COLUMN public.user_targets.persistency_13_month_target IS
'Auto-calculated from historical persistency data or defaults to 0.85';

COMMENT ON COLUMN public.user_targets.persistency_25_month_target IS
'Auto-calculated from historical persistency data or defaults to 0.75';

COMMENT ON COLUMN public.user_targets.expense_ratio_target IS
'Auto-calculated: (annual_expenses / annual_income_target)';

-- Log this redesign in the achievements column for tracking
UPDATE public.user_targets
SET achievements = achievements ||
  jsonb_build_object(
    'type', 'system_upgrade',
    'date', CURRENT_TIMESTAMP,
    'description', 'Targets page redesigned with intelligent auto-calculations',
    'version', '2.0'
  )
WHERE achievements IS NOT NULL;