-- supabase/migrations/20251219_001_fix_contract_level_and_earned_propagation.sql
-- Fix: Default contract_level to 80, propagate months_paid to commissions

-- ============================================================================
-- PART 1: Fix contract_level defaults and NULL values
-- ============================================================================

-- Update all users with NULL or 0 contract_level to 80
UPDATE user_profiles
SET contract_level = 80
WHERE contract_level IS NULL OR contract_level = 0;

-- Set default value for contract_level column
ALTER TABLE user_profiles
ALTER COLUMN contract_level SET DEFAULT 80;

-- Add a check constraint to prevent NULL or 0 contract_level
-- (Using a function-based approach for flexibility)
CREATE OR REPLACE FUNCTION ensure_valid_contract_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Default to 80 if NULL or 0
  IF NEW.contract_level IS NULL OR NEW.contract_level = 0 THEN
    NEW.contract_level := 80;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce valid contract_level
DROP TRIGGER IF EXISTS trigger_ensure_valid_contract_level ON user_profiles;
CREATE TRIGGER trigger_ensure_valid_contract_level
  BEFORE INSERT OR UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION ensure_valid_contract_level();

COMMENT ON FUNCTION ensure_valid_contract_level() IS
'Ensures contract_level is never NULL or 0. Defaults to 80.';

-- ============================================================================
-- PART 2: Create trigger to propagate months_paid from commissions to override_commissions
-- ============================================================================

CREATE OR REPLACE FUNCTION propagate_months_paid_to_overrides()
RETURNS TRIGGER AS $$
BEGIN
  -- Only act if months_paid changed
  IF OLD.months_paid IS DISTINCT FROM NEW.months_paid THEN
    -- Update override_commissions table for this policy
    UPDATE override_commissions
    SET
      months_paid = NEW.months_paid,
      updated_at = NOW()
    WHERE policy_id = NEW.policy_id;

    RAISE NOTICE 'Propagated months_paid=% to overrides for policy %', NEW.months_paid, NEW.policy_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on commissions table (not policies)
DROP TRIGGER IF EXISTS trigger_propagate_months_paid_to_overrides ON commissions;
CREATE TRIGGER trigger_propagate_months_paid_to_overrides
  AFTER UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION propagate_months_paid_to_overrides();

COMMENT ON FUNCTION propagate_months_paid_to_overrides() IS
'When commissions.months_paid changes, propagates to override_commissions table, triggering earned amount recalculation.';

-- ============================================================================
-- PART 3: Add trigger on override_commissions to auto-calculate earned amounts
-- (Similar to what exists on commissions table)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_override_commission_earned_amounts()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure months_paid is not negative
  NEW.months_paid := GREATEST(0, COALESCE(NEW.months_paid, 0));

  -- Calculate earned and unearned amounts
  -- earned = (override_amount / advance_months) * months_paid (capped at advance_months)
  NEW.earned_amount := NEW.override_commission_amount *
    (LEAST(NEW.months_paid, COALESCE(NEW.advance_months, 9))::DECIMAL /
     COALESCE(NEW.advance_months, 9));

  NEW.unearned_amount := NEW.override_commission_amount - NEW.earned_amount;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on override_commissions
DROP TRIGGER IF EXISTS trigger_update_override_earned ON override_commissions;
CREATE TRIGGER trigger_update_override_earned
  BEFORE INSERT OR UPDATE ON override_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_override_commission_earned_amounts();

COMMENT ON FUNCTION update_override_commission_earned_amounts() IS
'Automatically calculates earned_amount and unearned_amount for override_commissions based on months_paid.';

-- ============================================================================
-- PART 4: Regenerate missing override commissions for existing policies
-- ============================================================================

-- Create a function to regenerate overrides for a specific policy
CREATE OR REPLACE FUNCTION regenerate_override_commissions(p_policy_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_policy RECORD;
  v_upline_record RECORD;
  v_base_comp_level INTEGER;
  v_base_commission_rate DECIMAL(5,4);
  v_base_commission_amount DECIMAL(12,2);
  v_upline_commission_rate DECIMAL(5,4);
  v_upline_commission_amount DECIMAL(12,2);
  v_override_amount DECIMAL(12,2);
  v_months_paid INTEGER;
  v_count INTEGER := 0;
BEGIN
  -- Get policy details
  SELECT * INTO v_policy FROM policies WHERE id = p_policy_id;

  IF NOT FOUND THEN
    RAISE WARNING 'Policy % not found', p_policy_id;
    RETURN 0;
  END IF;

  -- Get months_paid from commissions table (not policies)
  SELECT COALESCE(months_paid, 0) INTO v_months_paid
  FROM commissions WHERE policy_id = p_policy_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_months_paid IS NULL THEN
    v_months_paid := 0;
  END IF;

  -- Get base agent's contract comp level
  SELECT contract_level INTO v_base_comp_level
  FROM user_profiles WHERE id = v_policy.user_id;

  IF v_base_comp_level IS NULL THEN
    RAISE WARNING 'Policy % owner has no contract_level', p_policy_id;
    RETURN 0;
  END IF;

  -- Get base agent's commission rate
  SELECT commission_percentage INTO v_base_commission_rate
  FROM comp_guide
  WHERE carrier_id = v_policy.carrier_id
    AND (product_id = v_policy.product_id OR product_type = v_policy.product)
    AND contract_level = v_base_comp_level
    AND effective_date <= v_policy.effective_date
    AND (expiration_date IS NULL OR expiration_date >= v_policy.effective_date)
  ORDER BY effective_date DESC
  LIMIT 1;

  IF v_base_commission_rate IS NULL THEN
    RAISE WARNING 'No comp_guide entry for policy %', p_policy_id;
    RETURN 0;
  END IF;

  v_base_commission_amount := v_policy.annual_premium * v_base_commission_rate;

  -- Walk up hierarchy and create overrides
  FOR v_upline_record IN (
    WITH RECURSIVE upline_chain AS (
      SELECT up.id as upline_id, up.contract_level as upline_comp_level, 1 as depth
      FROM user_profiles up
      WHERE up.id = (SELECT upline_id FROM user_profiles WHERE id = v_policy.user_id)
        AND up.id IS NOT NULL AND up.contract_level IS NOT NULL
      UNION
      SELECT up.id, up.contract_level, uc.depth + 1
      FROM user_profiles up
      JOIN upline_chain uc ON up.id = (SELECT upline_id FROM user_profiles WHERE id = uc.upline_id)
      WHERE up.id IS NOT NULL AND up.contract_level IS NOT NULL
    )
    SELECT * FROM upline_chain
  ) LOOP
    -- Skip if upline has same or lower comp level
    IF v_upline_record.upline_comp_level <= v_base_comp_level THEN
      CONTINUE;
    END IF;

    -- Get upline's commission rate
    SELECT commission_percentage INTO v_upline_commission_rate
    FROM comp_guide
    WHERE carrier_id = v_policy.carrier_id
      AND (product_id = v_policy.product_id OR product_type = v_policy.product)
      AND contract_level = v_upline_record.upline_comp_level
      AND effective_date <= v_policy.effective_date
      AND (expiration_date IS NULL OR expiration_date >= v_policy.effective_date)
    ORDER BY effective_date DESC
    LIMIT 1;

    IF v_upline_commission_rate IS NULL THEN
      CONTINUE;
    END IF;

    v_upline_commission_amount := v_policy.annual_premium * v_upline_commission_rate;
    v_override_amount := v_upline_commission_amount - v_base_commission_amount;

    IF v_override_amount > 0 THEN
      -- Check if override already exists
      IF NOT EXISTS (
        SELECT 1 FROM override_commissions
        WHERE policy_id = p_policy_id AND override_agent_id = v_upline_record.upline_id
      ) THEN
        INSERT INTO override_commissions (
          policy_id, base_agent_id, override_agent_id, hierarchy_depth,
          base_comp_level, override_comp_level, carrier_id, product_id,
          policy_premium, base_commission_amount, override_commission_amount,
          advance_months, months_paid, earned_amount, unearned_amount, status
        ) VALUES (
          p_policy_id, v_policy.user_id, v_upline_record.upline_id, v_upline_record.depth,
          v_base_comp_level, v_upline_record.upline_comp_level, v_policy.carrier_id, v_policy.product_id,
          v_policy.annual_premium, v_base_commission_amount, v_override_amount,
          9, v_months_paid, 0, v_override_amount, 'pending'
        );
        v_count := v_count + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Regenerate overrides for all existing policies that are missing them
DO $$
DECLARE
  v_policy RECORD;
  v_created INTEGER;
  v_total INTEGER := 0;
BEGIN
  FOR v_policy IN (
    SELECT p.id
    FROM policies p
    WHERE NOT EXISTS (
      SELECT 1 FROM override_commissions oc WHERE oc.policy_id = p.id
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles u
      WHERE u.id = p.user_id AND u.upline_id IS NOT NULL
    )
  ) LOOP
    v_created := regenerate_override_commissions(v_policy.id);
    v_total := v_total + v_created;
    RAISE NOTICE 'Created % overrides for policy %', v_created, v_policy.id;
  END LOOP;

  RAISE NOTICE 'Total override commissions created: %', v_total;
END $$;

-- Keep the function for future use
COMMENT ON FUNCTION regenerate_override_commissions(UUID) IS
'Regenerates override commission records for a policy. Useful for fixing policies created before contract_level was set.';
