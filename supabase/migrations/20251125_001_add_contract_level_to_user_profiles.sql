-- Migration: Add contract_level to user_profiles and fix override calculation trigger
-- Purpose: Move contract level storage from auth.users metadata to proper user_profiles column
-- Created: 2025-11-25

BEGIN;

-- ============================================
-- 1. ADD CONTRACT_LEVEL COLUMN TO USER_PROFILES
-- ============================================

ALTER TABLE user_profiles
ADD COLUMN contract_level INTEGER;

-- Add index for performance
CREATE INDEX idx_user_profiles_contract_level ON user_profiles(contract_level);

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.contract_level IS 'Insurance agent contract compensation level (e.g., 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145). Higher levels earn higher commission rates and receive overrides from lower levels.';

-- ============================================
-- 2. UPDATE OVERRIDE COMMISSION TRIGGER FUNCTION
-- ============================================

-- Replace the trigger function to read from user_profiles.contract_level
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
  -- Get base agent's contract comp level from user_profiles
  SELECT contract_level
  INTO v_base_comp_level
  FROM user_profiles
  WHERE id = NEW.user_id;

  -- If base agent has no comp level, skip override calculation
  IF v_base_comp_level IS NULL THEN
    RAISE WARNING 'Policy % created by user % has no contract_level set in user_profiles - skipping override calculation',
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
        up.contract_level as upline_comp_level,
        1 as depth
      FROM user_profiles up
      WHERE up.id = (
        SELECT upline_id FROM user_profiles WHERE id = NEW.user_id
      )
      AND up.id IS NOT NULL  -- has an upline
      AND up.contract_level IS NOT NULL  -- upline has contract level set

      UNION

      -- Recursive case: uplines of uplines
      SELECT
        up.id as upline_id,
        up.contract_level as upline_comp_level,
        uc.depth + 1
      FROM user_profiles up
      JOIN upline_chain uc ON up.id = (
        SELECT upline_id FROM user_profiles WHERE id = uc.upline_id
      )
      WHERE up.id IS NOT NULL
      AND up.contract_level IS NOT NULL
    )
    SELECT * FROM upline_chain
  ) LOOP
    -- Skip if upline has same or lower comp level (business rule validation)
    IF v_upline_record.upline_comp_level <= v_base_comp_level THEN
      RAISE WARNING 'Upline % has contract_level=% <= base_level=% - skipping override',
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

    -- Skip if no commission rate found for upline's level
    IF v_upline_commission_rate IS NULL THEN
      RAISE WARNING 'No comp_guide entry found for upline % at level % - skipping override',
        v_upline_record.upline_id, v_upline_record.upline_comp_level;
      CONTINUE;
    END IF;

    -- Calculate upline's commission amount and override
    v_upline_commission_amount := NEW.annual_premium * v_upline_commission_rate;
    v_override_amount := v_upline_commission_amount - v_base_commission_amount;

    -- Only create override if amount is positive
    IF v_override_amount > 0 THEN
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
        status,
        created_at
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
        COALESCE(NEW.advance_months, 9),
        0,
        0,
        v_override_amount,
        'pending',
        NOW()
      );
    ELSE
      RAISE WARNING 'Override amount for upline % is <= 0 (%.2f) - skipping',
        v_upline_record.upline_id, v_override_amount;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================
-- 3. ADD VALIDATION FUNCTION FOR HIERARCHY CONTRACT LEVELS
-- ============================================

-- Function to validate upline has higher contract level than downline
CREATE OR REPLACE FUNCTION validate_hierarchy_contract_levels()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_upline_contract_level INTEGER;
  v_downline_contract_level INTEGER;
BEGIN
  -- Only validate if upline_id is being set and contract_level exists
  IF NEW.upline_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get upline's contract level
  SELECT contract_level INTO v_upline_contract_level
  FROM user_profiles
  WHERE id = NEW.upline_id;

  -- Get downline's (current user's) contract level
  v_downline_contract_level := NEW.contract_level;

  -- Both must be set to validate
  IF v_upline_contract_level IS NULL OR v_downline_contract_level IS NULL THEN
    -- Don't block if contract levels aren't set yet
    RETURN NEW;
  END IF;

  -- Upline must have higher contract level
  IF v_upline_contract_level <= v_downline_contract_level THEN
    RAISE EXCEPTION 'Invalid hierarchy: Upline contract level (%) must be higher than downline contract level (%)',
      v_upline_contract_level, v_downline_contract_level;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger for hierarchy validation
DROP TRIGGER IF EXISTS validate_hierarchy_contract_levels_trigger ON user_profiles;
CREATE TRIGGER validate_hierarchy_contract_levels_trigger
  BEFORE INSERT OR UPDATE OF upline_id, contract_level
  ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION validate_hierarchy_contract_levels();

COMMIT;
