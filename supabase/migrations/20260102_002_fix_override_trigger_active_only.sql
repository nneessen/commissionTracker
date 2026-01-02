-- supabase/migrations/20260102_002_fix_override_trigger_active_only.sql
-- Critical Fix: Override commissions should only be created when policies become 'active'
--
-- Issues Fixed:
-- 1. Trigger was firing on INSERT (including pending policies) - now fires on UPDATE to 'active'
-- 2. No deduplication check - now checks IF NOT EXISTS before inserting
-- 3. No UNIQUE constraint - now enforces (policy_id, override_agent_id) uniqueness
-- 4. Cleanup: Removes orphaned, duplicate, and non-active policy overrides

-- ============================================================================
-- PART 1: Drop the existing INSERT trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_override_commissions ON policies;

-- ============================================================================
-- PART 2: Update the function with deduplication check
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
      -- DEDUPLICATION CHECK: Only insert if override doesn't already exist
      IF NOT EXISTS (
        SELECT 1 FROM override_commissions
        WHERE policy_id = NEW.id
          AND override_agent_id = v_upline_record.upline_id
      ) THEN
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
        );
      ELSE
        RAISE WARNING 'Override for policy % and upline % already exists - skipping duplicate',
          NEW.id, v_upline_record.upline_id;
      END IF;

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
- Only fires when policy status changes to active (not on INSERT)
- Added deduplication check to prevent duplicate records
- Override calculated as spread to immediate downline (floor-based)';

-- ============================================================================
-- PART 3: Create new trigger that fires only when status changes to 'active'
-- ============================================================================

CREATE TRIGGER trigger_create_override_commissions_on_active
  AFTER UPDATE OF status ON policies
  FOR EACH ROW
  WHEN (NEW.status = 'active' AND OLD.status IS DISTINCT FROM 'active')
  EXECUTE FUNCTION create_override_commissions();

COMMENT ON TRIGGER trigger_create_override_commissions_on_active ON policies IS
'Creates override commission records when a policy status changes to active.
Only fires when:
1. The status column is updated
2. New status is "active"
3. Old status was NOT "active" (prevents re-firing)
Added: 2026-01-02 - Fixes issue where overrides were created for pending policies.';

-- ============================================================================
-- PART 4: Clean up orphaned override records (policy no longer exists)
-- ============================================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM override_commissions
  WHERE policy_id NOT IN (SELECT id FROM policies);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % orphaned override commission records (policy no longer exists)', deleted_count;
  END IF;
END $$;

-- ============================================================================
-- PART 5: Clean up duplicate override records (keep oldest)
-- ============================================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM override_commissions
  WHERE id IN (
    SELECT id FROM (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY policy_id, override_agent_id
          ORDER BY created_at ASC
        ) as rn
      FROM override_commissions
    ) ranked
    WHERE rn > 1
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % duplicate override commission records', deleted_count;
  END IF;
END $$;

-- ============================================================================
-- PART 6: Delete overrides for non-active policies
-- ============================================================================

DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM override_commissions
  WHERE policy_id IN (
    SELECT id FROM policies WHERE status != 'active'
  );

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE NOTICE 'Deleted % override commission records for non-active policies', deleted_count;
  END IF;
END $$;

-- ============================================================================
-- PART 7: Add UNIQUE constraint to prevent future duplicates
-- ============================================================================

-- First check if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_override_policy_agent'
  ) THEN
    ALTER TABLE override_commissions
    ADD CONSTRAINT uq_override_policy_agent
    UNIQUE (policy_id, override_agent_id);

    RAISE NOTICE 'Added UNIQUE constraint uq_override_policy_agent on (policy_id, override_agent_id)';
  ELSE
    RAISE NOTICE 'UNIQUE constraint uq_override_policy_agent already exists';
  END IF;
END $$;

-- ============================================================================
-- PART 8: Log final state
-- ============================================================================

DO $$
DECLARE
  override_count INTEGER;
  policy_count INTEGER;
  active_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO override_count FROM override_commissions;
  SELECT COUNT(*) INTO policy_count FROM policies;
  SELECT COUNT(*) INTO active_policy_count FROM policies WHERE status = 'active';

  RAISE NOTICE 'Migration complete. Override records: %, Total policies: %, Active policies: %',
    override_count, policy_count, active_policy_count;
END $$;
