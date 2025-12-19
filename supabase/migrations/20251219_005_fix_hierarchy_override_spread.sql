-- supabase/migrations/20251219_005_fix_hierarchy_override_spread.sql
-- Fix: Override calculation should use spread to immediate downline, not base agent
--
-- BUG: Previously, each upline's override was calculated as:
--   upline_commission - BASE_agent_commission (WRONG)
--
-- FIX: Each upline's override should be calculated as:
--   upline_commission - PREVIOUS_LEVEL_commission (CORRECT)
--
-- Example with hierarchy: Main(140) → First(120) → Base(100)
-- Policy premium: $10,000
--
-- OLD (Wrong):
--   Base(100): $8,000 commission
--   First(120): override = $9,500 - $8,000 = $1,500 ✓
--   Main(140): override = $10,500 - $8,000 = $2,500 ✗ (should be $1,000)
--
-- NEW (Correct):
--   Base(100): $8,000 commission
--   First(120): override = $9,500 - $8,000 = $1,500 ✓
--   Main(140): override = $10,500 - $9,500 = $1,000 ✓

-- ============================================================================
-- PART 1: Replace the trigger function with corrected logic
-- ============================================================================

CREATE OR REPLACE FUNCTION create_override_commissions()
RETURNS TRIGGER AS $$
DECLARE
  v_upline_record RECORD;
  v_base_comp_level INTEGER;
  v_base_commission_rate DECIMAL(5,4);
  v_base_commission_amount DECIMAL(12,2);
  v_upline_commission_rate DECIMAL(5,4);
  v_upline_commission_amount DECIMAL(12,2);
  v_override_amount DECIMAL(12,2);
  -- NEW: Track the "floor" (previous level's) commission for correct spread calculation
  v_floor_commission_amount DECIMAL(12,2);
  v_floor_comp_level INTEGER;
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

  -- Initialize floor to base agent's values (first upline compares against base)
  v_floor_commission_amount := v_base_commission_amount;
  v_floor_comp_level := v_base_comp_level;

  -- Walk up the hierarchy chain and create override records for each upline
  -- CRITICAL: ORDER BY depth ASC ensures we process level 1 before level 2, etc.
  FOR v_upline_record IN (
    WITH RECURSIVE upline_chain AS (
      -- Base case: Get immediate upline (depth = 1)
      SELECT
        up.id as upline_id,
        up.contract_level as upline_comp_level,
        1 as depth
      FROM user_profiles up
      WHERE up.id = (
        SELECT upline_id FROM user_profiles WHERE id = NEW.user_id
      )
      AND up.id IS NOT NULL
      AND up.contract_level IS NOT NULL

      UNION

      -- Recursive case: Get upline's upline (depth = 2, 3, ...)
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
    ORDER BY depth ASC  -- CRITICAL: Process in depth order for correct floor tracking
  ) LOOP
    -- Skip if upline has same or lower comp level than current floor
    -- (no spread possible, but they're still in the chain)
    IF v_upline_record.upline_comp_level <= v_floor_comp_level THEN
      RAISE WARNING 'Upline % has contract_level=% <= floor_level=% - skipping override (no spread)',
        v_upline_record.upline_id, v_upline_record.upline_comp_level, v_floor_comp_level;
      -- NOTE: We do NOT update the floor here because this agent doesn't "capture" any spread
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

    -- Calculate upline's commission amount
    v_upline_commission_amount := NEW.annual_premium * v_upline_commission_rate;

    -- FIXED: Calculate override against FLOOR (previous captured level), not base
    v_override_amount := v_upline_commission_amount - v_floor_commission_amount;

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
        v_base_comp_level,  -- Keep reference to original policy writer's level
        v_upline_record.upline_comp_level,
        NEW.carrier_id,
        NEW.product_id,
        NEW.annual_premium,
        v_base_commission_amount,  -- Keep reference to original policy writer's commission
        v_override_amount,  -- FIXED: Now correctly calculated as spread to immediate downline
        9,  -- Default advance months
        0,
        0,
        v_override_amount,
        'pending',
        NOW()
      );

      -- CRITICAL: Update floor to this upline's commission for the next iteration
      -- This ensures the next upline only gets the spread between their level and this level
      v_floor_commission_amount := v_upline_commission_amount;
      v_floor_comp_level := v_upline_record.upline_comp_level;
    ELSE
      RAISE WARNING 'Override amount for upline % is <= 0 (%.2f) - skipping',
        v_upline_record.upline_id, v_override_amount;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_override_commissions() IS
'Creates override commission records for upline agents when a policy is created.
FIXED (2024-12-19): Override now calculated as spread to immediate downline, not base agent.
Each upline only gets the spread between their comp level and the level directly below them.';

-- ============================================================================
-- PART 2: Recalculate existing override commission records
-- ============================================================================

-- This recalculates all override_commissions records where hierarchy_depth > 1
-- using the corrected spread logic (each level compared to previous level, not base)

WITH policy_hierarchy AS (
  -- Get all override commissions with their upline commission amounts
  SELECT
    oc.id,
    oc.policy_id,
    oc.hierarchy_depth,
    oc.override_agent_id,
    oc.override_comp_level,
    oc.base_comp_level,
    oc.base_commission_amount,
    oc.override_commission_amount AS old_override_amount,
    oc.months_paid,
    oc.advance_months,
    p.annual_premium,
    p.carrier_id,
    p.product_id,
    p.product AS product_type,
    p.effective_date,
    -- Get the commission rate for this upline's level
    (
      SELECT commission_percentage
      FROM comp_guide cg
      WHERE cg.carrier_id = p.carrier_id
        AND (cg.product_id = p.product_id OR cg.product_type = p.product)
        AND cg.contract_level = oc.override_comp_level
        AND cg.effective_date <= p.effective_date
        AND (cg.expiration_date IS NULL OR cg.expiration_date >= p.effective_date)
      ORDER BY cg.effective_date DESC
      LIMIT 1
    ) AS upline_commission_rate
  FROM override_commissions oc
  JOIN policies p ON p.id = oc.policy_id
),
hierarchy_with_floor AS (
  -- Calculate the correct override amount using LAG to get previous level's commission
  SELECT
    ph.id,
    ph.policy_id,
    ph.hierarchy_depth,
    ph.override_agent_id,
    ph.annual_premium,
    ph.upline_commission_rate,
    ph.base_commission_amount,
    ph.old_override_amount,
    ph.months_paid,
    ph.advance_months,
    -- Calculate this upline's commission
    (ph.annual_premium * COALESCE(ph.upline_commission_rate, 0)) AS upline_commission,
    -- Get the floor (previous level's commission) using LAG
    -- For depth=1, floor is base_commission_amount
    -- For depth>1, floor is the previous upline's commission
    COALESCE(
      LAG(ph.annual_premium * ph.upline_commission_rate, 1) OVER (
        PARTITION BY ph.policy_id
        ORDER BY ph.hierarchy_depth ASC
      ),
      ph.base_commission_amount
    ) AS floor_commission
  FROM policy_hierarchy ph
  WHERE ph.upline_commission_rate IS NOT NULL
),
correct_overrides AS (
  -- Calculate the correct override amount
  SELECT
    hwf.id,
    hwf.policy_id,
    hwf.hierarchy_depth,
    hwf.old_override_amount,
    hwf.months_paid,
    hwf.advance_months,
    -- Correct override = this level's commission - floor (previous level)
    GREATEST(0, hwf.upline_commission - hwf.floor_commission) AS correct_override_amount
  FROM hierarchy_with_floor hwf
)
UPDATE override_commissions oc
SET
  override_commission_amount = co.correct_override_amount,
  -- Recalculate earned/unearned based on new override amount
  earned_amount = CASE
    WHEN co.advance_months > 0
    THEN co.correct_override_amount * (LEAST(co.months_paid, co.advance_months)::DECIMAL / co.advance_months)
    ELSE 0
  END,
  unearned_amount = CASE
    WHEN co.advance_months > 0
    THEN co.correct_override_amount - (co.correct_override_amount * (LEAST(co.months_paid, co.advance_months)::DECIMAL / co.advance_months))
    ELSE co.correct_override_amount
  END,
  updated_at = NOW()
FROM correct_overrides co
WHERE oc.id = co.id
  AND co.hierarchy_depth > 1  -- Only update level 2+ (level 1 was already correct)
  AND co.correct_override_amount <> oc.override_commission_amount;  -- Only update if changed

-- Log how many records were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RAISE NOTICE 'Updated % override commission records with corrected spread calculation', updated_count;
END $$;
