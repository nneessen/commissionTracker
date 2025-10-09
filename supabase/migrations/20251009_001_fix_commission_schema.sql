-- Migration: Fix Commission Schema - Remove Duplication, Clarify Terminology
-- Date: 2025-10-09
-- Purpose:
--   1. Remove advance_months from policies (keep only in commissions)
--   2. Rename commissions.amount → advance_amount for clarity
--   3. Ensure earned/unearned tracking is properly configured

BEGIN;

-- =====================================================
-- STEP 1: Ensure commissions.advance_months has data
-- =====================================================

-- Backfill commissions.advance_months from policies where NULL
UPDATE commissions c
SET advance_months = COALESCE(
  c.advance_months,
  (SELECT p.advance_months FROM policies p WHERE p.id = c.policy_id),
  9
)
WHERE c.advance_months IS NULL OR c.advance_months = 0;

-- Add NOT NULL constraint and default
ALTER TABLE commissions
ALTER COLUMN advance_months SET NOT NULL,
ALTER COLUMN advance_months SET DEFAULT 9;

-- =====================================================
-- STEP 2: Remove advance_months from policies (no longer needed)
-- =====================================================

-- Drop the redundant column from policies
ALTER TABLE policies
DROP COLUMN IF EXISTS advance_months;

-- =====================================================
-- STEP 3: Rename commissions.amount → advance_amount
-- =====================================================

ALTER TABLE commissions
RENAME COLUMN amount TO advance_amount;

-- =====================================================
-- STEP 4: Ensure earned/unearned tracking columns exist and have proper defaults
-- =====================================================

-- These should already exist, but ensure they have proper defaults
ALTER TABLE commissions
ALTER COLUMN months_paid SET DEFAULT 0,
ALTER COLUMN months_paid SET NOT NULL;

ALTER TABLE commissions
ALTER COLUMN earned_amount SET DEFAULT 0,
ALTER COLUMN earned_amount SET NOT NULL;

ALTER TABLE commissions
ALTER COLUMN unearned_amount SET DEFAULT 0,
ALTER COLUMN unearned_amount SET NOT NULL;

-- =====================================================
-- STEP 5: Update trigger to auto-calculate earned/unearned
-- =====================================================

DROP TRIGGER IF EXISTS trigger_update_commission_earned ON commissions;

CREATE OR REPLACE FUNCTION update_commission_earned_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate earned amount: (advance ÷ advance_months) × months_paid
  NEW.earned_amount := CASE
    WHEN NEW.advance_months > 0 THEN
      (NEW.advance_amount / NEW.advance_months) * LEAST(COALESCE(NEW.months_paid, 0), NEW.advance_months)
    ELSE 0
  END;

  -- Calculate unearned amount: advance - earned
  NEW.unearned_amount := NEW.advance_amount - NEW.earned_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_commission_earned
  BEFORE INSERT OR UPDATE OF advance_amount, advance_months, months_paid
  ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_commission_earned_amounts();

COMMENT ON FUNCTION update_commission_earned_amounts IS
'Auto-calculates earned_amount and unearned_amount when commission or payment data changes';

-- =====================================================
-- STEP 6: Backfill earned/unearned for existing records
-- =====================================================

-- Recalculate all existing earned/unearned amounts
UPDATE commissions
SET
  earned_amount = CASE
    WHEN advance_months > 0 THEN
      (advance_amount / advance_months) * LEAST(COALESCE(months_paid, 0), advance_months)
    ELSE 0
  END,
  unearned_amount = advance_amount - CASE
    WHEN advance_months > 0 THEN
      (advance_amount / advance_months) * LEAST(COALESCE(months_paid, 0), advance_months)
    ELSE 0
  END;

-- =====================================================
-- STEP 7: Update views
-- =====================================================

-- Drop and recreate commission_earning_status view
DROP VIEW IF EXISTS commission_earning_status;

CREATE OR REPLACE VIEW commission_earning_status AS
SELECT
  c.id,
  c.policy_id,
  c.user_id,
  c.advance_amount,
  c.advance_months,
  c.months_paid,
  c.earned_amount,
  c.unearned_amount,
  c.last_payment_date,
  ROUND((COALESCE(c.months_paid, 0)::DECIMAL / NULLIF(c.advance_months, 0)) * 100, 2) as percentage_earned,
  (COALESCE(c.months_paid, 0) >= c.advance_months) as is_fully_earned,
  GREATEST(0, c.advance_months - COALESCE(c.months_paid, 0)) as months_remaining,
  CASE
    WHEN c.advance_months > 0 THEN c.advance_amount / c.advance_months
    ELSE 0
  END as monthly_earning_rate,
  -- Chargeback risk assessment
  CASE
    WHEN COALESCE(c.months_paid, 0) = 0 THEN 'HIGH'
    WHEN c.months_paid < 3 THEN 'HIGH'
    WHEN c.months_paid < 6 THEN 'MEDIUM'
    WHEN c.months_paid < c.advance_months THEN 'LOW'
    ELSE 'NONE'
  END as chargeback_risk,
  c.chargeback_amount,
  c.chargeback_date,
  c.chargeback_reason,
  c.status,
  c.type,
  c.created_at,
  c.updated_at
FROM commissions c;

COMMENT ON VIEW commission_earning_status IS
'Shows earning progress: advance amount, earned portion, unearned portion at risk, and chargeback risk level';

-- Drop and recreate unearned_commission_summary view
DROP VIEW IF EXISTS unearned_commission_summary;

CREATE OR REPLACE VIEW unearned_commission_summary AS
SELECT
  c.user_id,
  COUNT(*) as total_commissions,
  SUM(c.advance_amount) as total_advances,
  SUM(c.earned_amount) as total_earned,
  SUM(c.unearned_amount) as total_unearned,
  SUM(COALESCE(c.chargeback_amount, 0)) as total_chargebacks,
  ROUND(AVG(COALESCE(c.months_paid, 0)), 2) as avg_months_paid,
  ROUND((SUM(COALESCE(c.earned_amount, 0)) / NULLIF(SUM(c.advance_amount), 0)) * 100, 2) as portfolio_earned_percentage,
  COUNT(CASE WHEN COALESCE(c.months_paid, 0) >= c.advance_months THEN 1 END) as fully_earned_count,
  COUNT(CASE WHEN COALESCE(c.months_paid, 0) < c.advance_months THEN 1 END) as at_risk_count
FROM commissions c
GROUP BY c.user_id;

COMMENT ON VIEW unearned_commission_summary IS
'Portfolio-level summary: total advances, earned amounts, unearned amounts at risk';

-- =====================================================
-- STEP 8: Update auto_create_commission_record function
-- =====================================================

CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_advance_amount DECIMAL;
  v_contract_level DECIMAL;
  v_advance_months INTEGER := 9; -- Always use 9 months (industry standard)
BEGIN
  -- Only create commission for active or pending policies
  IF NEW.status NOT IN ('active', 'pending') THEN
    RETURN NEW;
  END IF;

  -- Get user's contract level from user metadata (fallback to 1.0)
  v_contract_level := COALESCE(
    (
      SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
      FROM auth.users
      WHERE id = NEW.user_id
    ),
    1.0
  );

  -- Calculate advance: Monthly Premium × 9 Months × Commission % × Contract Level
  v_advance_amount := (NEW.monthly_premium * v_advance_months * NEW.commission_percentage * v_contract_level);

  -- Only create commission record if amount > 0 and no commission exists
  IF v_advance_amount > 0 AND NOT EXISTS (
    SELECT 1 FROM commissions WHERE policy_id = NEW.id
  ) THEN
    INSERT INTO commissions (
      user_id,
      policy_id,
      carrier_id,
      advance_amount,
      advance_months,
      months_paid,
      earned_amount,
      unearned_amount,
      status,
      type,
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      NEW.carrier_id,
      v_advance_amount,
      v_advance_months,
      0, -- No months paid yet
      0, -- Nothing earned yet (trigger will calculate)
      v_advance_amount, -- All unearned initially (trigger will calculate)
      CASE WHEN NEW.status = 'active' THEN 'paid' ELSE 'pending' END,
      'first_year', -- Default type
      'Auto-generated advance for policy ' || NEW.policy_number
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_create_commission_record IS
'Auto-creates commission advance (9-month) when new policy is inserted';

COMMIT;
