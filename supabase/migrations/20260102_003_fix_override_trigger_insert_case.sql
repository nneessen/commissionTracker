-- supabase/migrations/20260102_003_fix_override_trigger_insert_case.sql
-- Fix: Handle policies created directly with status='active' (INSERT case)
-- Fix: Use ON CONFLICT DO NOTHING to prevent race condition errors

-- ============================================================================
-- PART 1: Update function to use ON CONFLICT DO NOTHING
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
  v_floor_commission_amount DECIMAL(12,2);
  v_floor_comp_level INTEGER;
BEGIN
  -- Only process if policy is active
  IF NEW.status != 'active' THEN
    RETURN NEW;
  END IF;

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
    IF v_upline_record.upline_comp_level <= v_floor_comp_level THEN
      RAISE WARNING 'Upline % has contract_level=% <= floor_level=% - skipping override (no spread)',
        v_upline_record.upline_id, v_upline_record.upline_comp_level, v_floor_comp_level;
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

    -- Calculate override against FLOOR (previous captured level), not base
    v_override_amount := v_upline_commission_amount - v_floor_commission_amount;

    -- Only create override if amount is positive
    IF v_override_amount > 0 THEN
      -- Use ON CONFLICT DO NOTHING to handle race conditions safely
      -- The UNIQUE constraint (policy_id, override_agent_id) prevents duplicates
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
        9,  -- Default advance months
        0,
        0,
        v_override_amount,
        'pending',
        NOW()
      )
      ON CONFLICT (policy_id, override_agent_id) DO NOTHING;

      -- Update floor to this upline's commission for the next iteration
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
'Creates override commission records for upline agents when a policy becomes active.
FIXED (2026-01-02):
- Handles both INSERT and UPDATE cases (policy created as active or changed to active)
- Uses ON CONFLICT DO NOTHING to prevent race condition errors
- Only processes policies with status = active
- Override calculated as spread to immediate downline (floor-based)';

-- ============================================================================
-- PART 2: Drop the UPDATE-only trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_override_commissions_on_active ON policies;

-- ============================================================================
-- PART 3: Create combined INSERT/UPDATE trigger
-- ============================================================================

-- This trigger handles BOTH cases:
-- 1. Policy INSERT with status = 'active' (direct creation as active)
-- 2. Policy UPDATE where status changes to 'active'

CREATE TRIGGER trigger_create_override_commissions_on_active
  AFTER INSERT OR UPDATE OF status ON policies
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION create_override_commissions();

COMMENT ON TRIGGER trigger_create_override_commissions_on_active ON policies IS
'Creates override commission records when a policy becomes active.
Fires on:
1. INSERT when status = active (policy created directly as active)
2. UPDATE when status changes to active
The function internally checks for duplicates using ON CONFLICT DO NOTHING.
Added: 2026-01-02';

-- ============================================================================
-- PART 4: Log completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Migration complete: Trigger now handles INSERT and UPDATE cases with ON CONFLICT safety';
END $$;
