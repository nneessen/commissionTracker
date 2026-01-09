-- supabase/migrations/20260110_002_drop_broken_commission_trigger.sql
-- Migration: Drop broken auto_create_commission trigger
--
-- PROBLEM: The trigger `trigger_auto_create_commission` uses a WRONG formula
-- that multiplies by contract_level instead of using it to look up the rate.
--
-- WRONG formula in calculate_commission_advance():
--   commission_advance := monthly_premium * commission_percentage * CONTRACT_LEVEL * advance_months
--
-- CORRECT calculation (in app code):
--   1. Look up commission_rate from comp_guide using (product_id, contract_level)
--   2. advance_amount = monthly_premium * commission_rate * advance_months
--
-- The app code in CommissionCalculationService correctly handles commission creation.
-- This trigger was creating commissions with wrong amounts ($1080 instead of $900).

-- ============================================================================
-- 1. Drop the broken trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_auto_create_commission ON policies;

-- ============================================================================
-- 2. Optionally drop the broken functions (keep for now in case needed)
-- ============================================================================

-- Not dropping the functions as they might be referenced elsewhere
-- DROP FUNCTION IF EXISTS auto_create_commission_record() CASCADE;
-- DROP FUNCTION IF EXISTS calculate_commission_advance(DECIMAL, DECIMAL, INTEGER, DECIMAL) CASCADE;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE policies IS
'Commission records are now created by the application code (CommissionCalculationService)
which correctly looks up commission rates from comp_guide based on product_id and contract_level.
The trigger_auto_create_commission was dropped because it used an incorrect formula.';
