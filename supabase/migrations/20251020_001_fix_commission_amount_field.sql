-- /home/nneessen/projects/commissionTracker/supabase/migrations/20251020_001_fix_commission_amount_field.sql
-- Fix field name mismatch in trigger function
--
-- ISSUE: Function update_commission_earned_amounts() references
-- NEW.commission_amount but the actual column is called 'amount'
--
-- FIX: Update the function to use the correct field name

BEGIN;

-- Drop and recreate the function with the correct field name
CREATE OR REPLACE FUNCTION public.update_commission_earned_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure months_paid is not negative
  NEW.months_paid := GREATEST(0, COALESCE(NEW.months_paid, 0));

  -- Recalculate earned and unearned amounts when months_paid changes
  NEW.earned_amount := public.calculate_earned_amount(
    NEW.amount,  -- FIX: Changed from NEW.commission_amount to NEW.amount
    COALESCE(NEW.advance_months, 9),
    NEW.months_paid
  );

  NEW.unearned_amount := NEW.amount - NEW.earned_amount;  -- FIX: Changed from NEW.commission_amount

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_commission_earned_amounts IS
'Trigger function to automatically calculate earned/unearned amounts based on months_paid. FIXED: Now uses correct field name "amount" instead of "commission_amount"';

-- Also fix the views that reference commission_amount
DROP VIEW IF EXISTS commission_earning_detail CASCADE;
CREATE OR REPLACE VIEW commission_earning_detail AS
SELECT
  c.id as commission_id,
  c.policy_id,
  c.user_id,
  c.amount as advance_amount,  -- FIX: Changed from c.commission_amount
  c.advance_months,
  c.months_paid,
  c.earned_amount,
  c.unearned_amount,
  c.chargeback_amount,
  c.status,
  (c.months_paid >= c.advance_months) as is_fully_earned,
  GREATEST(0, c.advance_months - c.months_paid) as months_remaining,
  c.amount / NULLIF(c.advance_months, 1) as monthly_earning_rate,  -- FIX: Changed from c.commission_amount
  -- Chargeback risk assessment
  CASE
    WHEN c.status = 'paid' AND c.months_paid >= c.advance_months THEN 'NO_RISK'
    WHEN c.status = 'paid' AND c.months_paid >= 6 THEN 'LOW_RISK'
    WHEN c.status = 'paid' AND c.months_paid >= 3 THEN 'MEDIUM_RISK'
    WHEN c.status = 'paid' THEN 'HIGH_RISK'
    ELSE 'NOT_APPLICABLE'
  END as chargeback_risk_level,
  p.status as policy_status,
  p.effective_date,
  p.annual_premium
FROM commissions c
JOIN policies p ON p.id = c.policy_id;

COMMENT ON VIEW commission_earning_detail IS
'Detailed view of commission earning status with risk assessment. FIXED: Now uses correct field name "amount"';

-- Fix the aggregate view
DROP VIEW IF EXISTS commission_earning_summary CASCADE;
CREATE OR REPLACE VIEW commission_earning_summary AS
SELECT
  c.user_id,
  COUNT(*) as total_commissions,
  SUM(c.amount) as total_advances,  -- FIX: Changed from c.commission_amount
  SUM(c.earned_amount) as total_earned,
  SUM(c.unearned_amount) as total_unearned,
  SUM(c.chargeback_amount) as total_chargebacks,
  ROUND(AVG(c.months_paid), 2) as avg_months_paid,
  ROUND((SUM(c.earned_amount) / NULLIF(SUM(c.amount), 0)) * 100, 2) as portfolio_earned_percentage,  -- FIX: Changed from c.commission_amount
  COUNT(CASE WHEN c.months_paid >= c.advance_months THEN 1 END) as fully_earned_count,
  COUNT(CASE WHEN c.months_paid < c.advance_months THEN 1 END) as at_risk_count
FROM commissions c
GROUP BY c.user_id;

COMMENT ON VIEW commission_earning_summary IS
'User-level summary of commission earnings and risk. FIXED: Now uses correct field name "amount"';

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Commission Amount Field Fix Applied';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Fixed function: update_commission_earned_amounts()';
  RAISE NOTICE 'Fixed views: commission_earning_detail, commission_earning_summary';
  RAISE NOTICE 'Changed: commission_amount -> amount (correct field name)';
  RAISE NOTICE '';
  RAISE NOTICE 'Policy status updates should now work correctly!';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;