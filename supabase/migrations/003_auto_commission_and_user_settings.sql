-- Auto Commission Creation and User Settings
-- Automatically creates commission records when policies are added
-- Adds user settings support for contract level and personal goals
-- Created: 2025-10-08

BEGIN;

-- ============================================
-- USER SETTINGS ENHANCEMENTS
-- ============================================

-- Insert default user settings (contract level, advance months, personal goals)
-- These will be used for commission calculations
INSERT INTO constants (key, value, description) VALUES
  ('default_contract_level', 100, 'Default contract level percentage (100 = 100%, 110 = 110%)'),
  ('default_advance_months', 9, 'Default advance months for commission calculation'),
  ('monthly_breakeven', 0, 'Monthly breakeven target (expenses)'),
  ('annual_income_goal', 120000, 'Annual income goal'),
  ('monthly_surplus_goal', 5000, 'Monthly surplus goal beyond breakeven')
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- FUNCTION: Calculate Commission Advance
-- ============================================

CREATE OR REPLACE FUNCTION calculate_commission_advance(
  p_annual_premium DECIMAL,
  p_commission_percentage DECIMAL,
  p_advance_months INTEGER,
  p_contract_level DECIMAL DEFAULT 1.0
) RETURNS DECIMAL AS $$
DECLARE
  monthly_premium DECIMAL;
  commission_advance DECIMAL;
BEGIN
  -- Validate inputs
  IF p_annual_premium <= 0 OR p_commission_percentage <= 0 OR p_advance_months <= 0 THEN
    RETURN 0;
  END IF;

  -- Calculate monthly premium
  monthly_premium := p_annual_premium / 12.0;

  -- Calculate commission advance
  -- Formula: Monthly Premium × Commission % × Contract Level × Advance Months
  commission_advance := monthly_premium * p_commission_percentage * p_contract_level * p_advance_months;

  RETURN commission_advance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNCTION: Auto-create Commission Record
-- ============================================

CREATE OR REPLACE FUNCTION auto_create_commission_record()
RETURNS TRIGGER AS $$
DECLARE
  v_commission_amount DECIMAL;
  v_contract_level DECIMAL;
  v_advance_months INTEGER;
BEGIN
  -- Only create commission for active or pending policies
  IF NEW.status NOT IN ('active', 'pending') THEN
    RETURN NEW;
  END IF;

  -- Get user's contract level from user metadata (fallback to constant)
  v_contract_level := COALESCE(
    (
      SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
      FROM auth.users
      WHERE id = NEW.user_id
    ),
    (SELECT value / 100.0 FROM constants WHERE key = 'default_contract_level' LIMIT 1),
    1.0
  );

  -- Get advance months (default to 9)
  v_advance_months := COALESCE(
    NEW.advance_months,
    (SELECT value::INTEGER FROM constants WHERE key = 'default_advance_months' LIMIT 1),
    9
  );

  -- Calculate commission advance
  v_commission_amount := calculate_commission_advance(
    NEW.annual_premium,
    COALESCE(NEW.commission_percentage, 0),
    v_advance_months,
    v_contract_level
  );

  -- Only create commission record if amount > 0 and no commission exists for this policy
  IF v_commission_amount > 0 AND NOT EXISTS (
    SELECT 1 FROM commissions WHERE policy_id = NEW.id
  ) THEN
    INSERT INTO commissions (
      user_id,
      policy_id,
      carrier_id,
      commission_amount,
      status,
      is_advance,
      advance_months,
      months_paid,
      earned_amount,
      unearned_amount,
      notes
    ) VALUES (
      NEW.user_id,
      NEW.id,
      NEW.carrier_id,
      v_commission_amount,
      CASE
        WHEN NEW.status = 'active' THEN 'paid'
        ELSE 'pending'
      END,
      true,
      v_advance_months,
      0, -- No months paid yet
      0, -- No months earned yet
      v_commission_amount, -- All unearned initially
      'Auto-generated commission record for policy ' || NEW.policy_number
    );

    RAISE NOTICE 'Created commission record: $% for policy %', v_commission_amount, NEW.policy_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-create commission on policy insert
-- ============================================

DROP TRIGGER IF EXISTS trigger_auto_create_commission ON policies;

CREATE TRIGGER trigger_auto_create_commission
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_commission_record();

-- ============================================
-- FUNCTION: Update Commission Status on Policy Status Change
-- ============================================

CREATE OR REPLACE FUNCTION update_commission_on_policy_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When policy becomes active, mark commission as paid
  IF OLD.status != 'active' AND NEW.status = 'active' THEN
    UPDATE commissions
    SET status = 'paid',
        payment_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE policy_id = NEW.id
      AND status = 'pending';

    RAISE NOTICE 'Marked commission as paid for policy %', NEW.policy_number;
  END IF;

  -- When policy is cancelled or lapsed, mark commission for chargeback review
  IF NEW.status IN ('cancelled', 'lapsed') AND OLD.status = 'active' THEN
    -- Create chargeback record
    INSERT INTO chargebacks (
      user_id,
      policy_id,
      commission_id,
      chargeback_amount,
      chargeback_date,
      reason,
      status
    )
    SELECT
      c.user_id,
      c.policy_id,
      c.id,
      c.unearned_amount, -- Chargeback the unearned portion
      CURRENT_DATE,
      'Policy ' || NEW.status || ' - Auto-generated chargeback',
      'pending'
    FROM commissions c
    WHERE c.policy_id = NEW.id
      AND c.is_advance = true
      AND c.unearned_amount > 0
      AND NOT EXISTS (
        SELECT 1 FROM chargebacks WHERE commission_id = c.id
      );

    RAISE NOTICE 'Created chargeback record for policy %', NEW.policy_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Update commission on policy status change
-- ============================================

DROP TRIGGER IF EXISTS trigger_update_commission_status ON policies;

CREATE TRIGGER trigger_update_commission_status
  AFTER UPDATE ON policies
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_commission_on_policy_status();

-- ============================================
-- BACKFILL: Create commission records for existing policies
-- ============================================

DO $$
DECLARE
  policy_record RECORD;
  v_commission_amount DECIMAL;
  v_contract_level DECIMAL;
  v_advance_months INTEGER;
  created_count INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting backfill of commission records for existing policies...';

  FOR policy_record IN
    SELECT p.*
    FROM policies p
    WHERE p.status IN ('active', 'pending')
      AND NOT EXISTS (
        SELECT 1 FROM commissions c WHERE c.policy_id = p.id
      )
  LOOP
    -- Get user's contract level
    v_contract_level := COALESCE(
      (
        SELECT (raw_user_meta_data->>'contract_comp_level')::DECIMAL / 100.0
        FROM auth.users
        WHERE id = policy_record.user_id
      ),
      (SELECT value / 100.0 FROM constants WHERE key = 'default_contract_level' LIMIT 1),
      1.0
    );

    -- Get advance months
    v_advance_months := COALESCE(
      policy_record.advance_months,
      (SELECT value::INTEGER FROM constants WHERE key = 'default_advance_months' LIMIT 1),
      9
    );

    -- Calculate commission
    v_commission_amount := calculate_commission_advance(
      policy_record.annual_premium,
      COALESCE(policy_record.commission_percentage, 0),
      v_advance_months,
      v_contract_level
    );

    -- Create commission record
    IF v_commission_amount > 0 THEN
      INSERT INTO commissions (
        user_id,
        policy_id,
        carrier_id,
        commission_amount,
        status,
        is_advance,
        advance_months,
        months_paid,
        earned_amount,
        unearned_amount,
        payment_date,
        notes
      ) VALUES (
        policy_record.user_id,
        policy_record.id,
        policy_record.carrier_id,
        v_commission_amount,
        CASE
          WHEN policy_record.status = 'active' THEN 'paid'
          ELSE 'pending'
        END,
        true,
        v_advance_months,
        0,
        0,
        v_commission_amount,
        CASE
          WHEN policy_record.status = 'active' THEN policy_record.effective_date
          ELSE NULL
        END,
        'Backfilled commission record for policy ' || policy_record.policy_number
      );

      created_count := created_count + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Backfill complete: Created % commission records', created_count;
END $$;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Auto Commission & User Settings Migration Complete!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Functions created:';
    RAISE NOTICE '  - calculate_commission_advance()';
    RAISE NOTICE '  - auto_create_commission_record()';
    RAISE NOTICE '  - update_commission_on_policy_status()';
    RAISE NOTICE '';
    RAISE NOTICE 'Triggers created:';
    RAISE NOTICE '  - trigger_auto_create_commission';
    RAISE NOTICE '  - trigger_update_commission_status';
    RAISE NOTICE '';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  ✓ Auto-create commission records for new policies';
    RAISE NOTICE '  ✓ Auto-update commission status when policy status changes';
    RAISE NOTICE '  ✓ Auto-create chargeback records for cancelled/lapsed policies';
    RAISE NOTICE '  ✓ Backfilled commission records for existing policies';
    RAISE NOTICE '===========================================';
END $$;
