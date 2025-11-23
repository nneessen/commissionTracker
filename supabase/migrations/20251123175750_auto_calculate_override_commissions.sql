-- Migration: Auto-Calculate Override Commissions
-- Purpose: Automatically create override commission records when policies are inserted
--          and cascade status changes to override commissions
-- Created: 2025-11-23

BEGIN;

-- ============================================
-- 1. CREATE FUNCTION TO CALCULATE OVERRIDE COMMISSIONS ON POLICY INSERT
-- ============================================

CREATE OR REPLACE FUNCTION create_override_commissions()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_upline_record RECORD;
  v_base_comp_level INTEGER;
  v_base_commission_rate DECIMAL(5,4);
  v_base_commission_amount DECIMAL(12,2);
  v_upline_commission_rate DECIMAL(5,4);
  v_upline_commission_amount DECIMAL(12,2);
  v_override_amount DECIMAL(12,2);
BEGIN
  -- Get base agent's contract comp level from auth.users metadata
  SELECT
    COALESCE(
      (raw_user_meta_data->>'contractCompLevel')::INTEGER,
      100  -- default level if not set
    )
  INTO v_base_comp_level
  FROM auth.users
  WHERE id = NEW.user_id;

  -- If base agent has no comp level, skip override calculation
  IF v_base_comp_level IS NULL THEN
    RAISE WARNING 'Policy % created by user % has no contractCompLevel - skipping override calculation',
      NEW.id, NEW.user_id;
    RETURN NEW;
  END IF;

  -- Get base agent's commission rate from comp_guide
  SELECT commission_percentage
  INTO v_base_commission_rate
  FROM comp_guide
  WHERE carrier_id = NEW.carrier_id
    AND (product_id = NEW.product_id OR product_type = NEW.product)
    AND contract_level = v_base_comp_level
    AND effective_date <= NEW.effective_date
    AND (expiration_date IS NULL OR expiration_date >= NEW.effective_date)
  ORDER BY effective_date DESC
  LIMIT 1;

  -- If no commission rate found in comp_guide, skip override calculation
  IF v_base_commission_rate IS NULL THEN
    RAISE WARNING 'No comp_guide entry found for carrier=%, product=%, level=% - skipping override calculation',
      NEW.carrier_id, NEW.product, v_base_comp_level;
    RETURN NEW;
  END IF;

  -- Calculate base commission amount
  v_base_commission_amount := NEW.annual_premium * v_base_commission_rate;

  -- Walk up the hierarchy chain and create override records for each upline
  FOR v_upline_record IN (
    WITH RECURSIVE upline_chain AS (
      -- Base case: immediate upline of policy writer
      SELECT
        up.id as upline_id,
        COALESCE(
          (SELECT (raw_user_meta_data->>'contractCompLevel')::INTEGER
           FROM auth.users WHERE id = up.id),
          100
        ) as upline_comp_level,
        1 as depth
      FROM user_profiles up
      WHERE up.id = (
        SELECT upline_id FROM user_profiles WHERE id = NEW.user_id
      )
      AND up.id IS NOT NULL  -- has an upline

      UNION

      -- Recursive case: uplines of uplines
      SELECT
        up.id as upline_id,
        COALESCE(
          (SELECT (raw_user_meta_data->>'contractCompLevel')::INTEGER
           FROM auth.users WHERE id = up.id),
          100
        ) as upline_comp_level,
        uc.depth + 1
      FROM user_profiles up
      JOIN upline_chain uc ON up.id = (
        SELECT upline_id FROM user_profiles WHERE id = uc.upline_id
      )
      WHERE up.id IS NOT NULL
    )
    SELECT * FROM upline_chain
  ) LOOP
    -- Skip if upline has same or lower comp level (shouldn't happen, but safety check)
    IF v_upline_record.upline_comp_level <= v_base_comp_level THEN
      RAISE WARNING 'Upline % has comp_level=% <= base_level=% - skipping override',
        v_upline_record.upline_id, v_upline_record.upline_comp_level, v_base_comp_level;
      CONTINUE;
    END IF;

    -- Get upline's commission rate from comp_guide
    SELECT commission_percentage
    INTO v_upline_commission_rate
    FROM comp_guide
    WHERE carrier_id = NEW.carrier_id
      AND (product_id = NEW.product_id OR product_type = NEW.product)
      AND contract_level = v_upline_record.upline_comp_level
      AND effective_date <= NEW.effective_date
      AND (expiration_date IS NULL OR expiration_date >= NEW.effective_date)
    ORDER BY effective_date DESC
    LIMIT 1;

    -- If no commission rate found for upline, skip this upline
    IF v_upline_commission_rate IS NULL THEN
      RAISE WARNING 'No comp_guide entry for upline % level=% - skipping',
        v_upline_record.upline_id, v_upline_record.upline_comp_level;
      CONTINUE;
    END IF;

    -- Calculate upline's commission amount (what they would earn on this policy)
    v_upline_commission_amount := NEW.annual_premium * v_upline_commission_rate;

    -- Override is the DIFFERENCE between upline's commission and base commission
    v_override_amount := v_upline_commission_amount - v_base_commission_amount;

    -- Skip if override is negative or zero (shouldn't happen, but safety check)
    IF v_override_amount <= 0 THEN
      RAISE WARNING 'Override amount <= 0 for upline % - skipping', v_upline_record.upline_id;
      CONTINUE;
    END IF;

    -- Insert override commission record
    INSERT INTO override_commissions (
      policy_id,
      base_agent_id,
      override_agent_id,
      hierarchy_depth,
      base_comp_level,
      override_comp_level,
      carrier_id,
      product_id,
      policy_premium,
      base_commission_amount,
      override_commission_amount,
      advance_months,
      months_paid,
      earned_amount,
      unearned_amount,
      status
    ) VALUES (
      NEW.id,
      NEW.user_id,
      v_upline_record.upline_id,
      v_upline_record.depth,
      v_base_comp_level,
      v_upline_record.upline_comp_level,
      NEW.carrier_id,
      NEW.product_id,
      NEW.annual_premium,
      v_base_commission_amount,
      v_override_amount,
      COALESCE(NEW.advance_months, 9), -- default 9 months advance
      0, -- no payments yet
      0, -- no earned amount yet
      v_override_amount, -- all unearned initially
      'pending' -- initial status
    );

    RAISE NOTICE 'Created override commission: upline=% depth=% amount=%',
      v_upline_record.upline_id, v_upline_record.depth, v_override_amount;

  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================
-- 2. CREATE TRIGGER TO AUTO-CALCULATE OVERRIDES ON POLICY INSERT
-- ============================================

CREATE TRIGGER create_override_commissions_trigger
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION create_override_commissions();

-- ============================================
-- 3. CREATE FUNCTION TO CASCADE POLICY STATUS CHANGES TO OVERRIDES
-- ============================================

CREATE OR REPLACE FUNCTION update_override_commissions_on_policy_change()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act if policy status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    -- Policy lapsed or cancelled ’ charge back overrides
    IF NEW.status IN ('lapsed', 'cancelled') THEN
      UPDATE override_commissions
      SET
        status = 'charged_back',
        chargeback_amount = unearned_amount,
        chargeback_date = CURRENT_DATE,
        chargeback_reason = 'Policy ' || NEW.status
      WHERE policy_id = NEW.id
        AND status NOT IN ('charged_back', 'cancelled'); -- don't re-charge already charged back

      RAISE NOTICE 'Charged back % override commissions for policy %',
        (SELECT COUNT(*) FROM override_commissions WHERE policy_id = NEW.id), NEW.id;

    -- Policy activated ’ mark overrides as earned
    ELSIF NEW.status = 'active' AND OLD.status != 'active' THEN
      UPDATE override_commissions
      SET status = 'earned'
      WHERE policy_id = NEW.id
        AND status = 'pending';

      RAISE NOTICE 'Marked % override commissions as earned for policy %',
        (SELECT COUNT(*) FROM override_commissions WHERE policy_id = NEW.id), NEW.id;
    END IF;

  END IF;

  RETURN NEW;
END;
$$;

-- ============================================
-- 4. CREATE TRIGGER TO CASCADE STATUS CHANGES
-- ============================================

CREATE TRIGGER update_overrides_on_policy_status_trigger
  AFTER UPDATE ON policies
  FOR EACH ROW
  EXECUTE FUNCTION update_override_commissions_on_policy_change();

-- ============================================
-- 5. CREATE FUNCTION TO UPDATE OVERRIDE EARNED AMOUNTS
-- ============================================
-- This function should be called when a premium payment is recorded
-- (similar to how base commissions track earned vs unearned)

CREATE OR REPLACE FUNCTION update_override_earned_amount(
  p_policy_id UUID,
  p_months_paid INTEGER
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_override RECORD;
  v_earned_amount DECIMAL(12,2);
  v_unearned_amount DECIMAL(12,2);
BEGIN
  FOR v_override IN (
    SELECT id, override_commission_amount, advance_months
    FROM override_commissions
    WHERE policy_id = p_policy_id
  ) LOOP
    -- Calculate earned amount proportionally
    v_earned_amount := v_override.override_commission_amount *
      (LEAST(p_months_paid, v_override.advance_months)::DECIMAL / v_override.advance_months);

    v_unearned_amount := v_override.override_commission_amount - v_earned_amount;

    -- Update override commission
    UPDATE override_commissions
    SET
      months_paid = p_months_paid,
      earned_amount = v_earned_amount,
      unearned_amount = GREATEST(0, v_unearned_amount),
      updated_at = NOW()
    WHERE id = v_override.id;
  END LOOP;
END;
$$;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Migration 3: Override Auto-Calculation!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Created functions:';
    RAISE NOTICE '  - create_override_commissions()';
    RAISE NOTICE '    * Fires AFTER INSERT on policies';
    RAISE NOTICE '    * Walks up entire hierarchy chain';
    RAISE NOTICE '    * Looks up commission rates from comp_guide';
    RAISE NOTICE '    * Calculates override = upline_rate - base_rate';
    RAISE NOTICE '    * Inserts override_commission records';
    RAISE NOTICE '';
    RAISE NOTICE '  - update_override_commissions_on_policy_change()';
    RAISE NOTICE '    * Fires AFTER UPDATE on policies';
    RAISE NOTICE '    * Cascades status changes to overrides';
    RAISE NOTICE '    * Lapsed/cancelled ’ charged_back';
    RAISE NOTICE '    * Active ’ earned';
    RAISE NOTICE '';
    RAISE NOTICE '  - update_override_earned_amount()';
    RAISE NOTICE '    * Call manually to update earned amounts';
    RAISE NOTICE '    * Tracks earned vs unearned (advance model)';
    RAISE NOTICE '';
    RAISE NOTICE 'Override commissions now auto-create on policy insert!';
    RAISE NOTICE '===========================================';
END $$;
