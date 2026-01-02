-- supabase/migrations/reverts/20260102_002_revert_fix_override_trigger.sql
-- Reverts: 20260102_002_fix_override_trigger_active_only.sql
--
-- WARNING: This revert script cannot recover deleted override records.
-- The original migration deleted:
-- - Orphaned override records (policy no longer exists)
-- - Duplicate override records
-- - Override records for non-active policies
--
-- These records are permanently lost and must be regenerated if needed.

-- ============================================================================
-- PART 1: Drop the new trigger
-- ============================================================================

DROP TRIGGER IF EXISTS trigger_create_override_commissions_on_active ON policies;

-- ============================================================================
-- PART 2: Drop the UNIQUE constraint
-- ============================================================================

ALTER TABLE override_commissions
DROP CONSTRAINT IF EXISTS uq_override_policy_agent;

-- ============================================================================
-- PART 3: Restore original function (without dedup check)
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
  SELECT contract_level INTO v_base_comp_level
  FROM user_profiles WHERE id = NEW.user_id;

  IF v_base_comp_level IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT commission_percentage INTO v_base_commission_rate
  FROM comp_guide
  WHERE carrier_id = NEW.carrier_id
    AND (product_id = NEW.product_id OR product_type = NEW.product)
    AND contract_level = v_base_comp_level
    AND effective_date <= NEW.effective_date
    AND (expiration_date IS NULL OR expiration_date >= NEW.effective_date)
  ORDER BY effective_date DESC LIMIT 1;

  IF v_base_commission_rate IS NULL THEN
    RETURN NEW;
  END IF;

  v_base_commission_amount := NEW.annual_premium * v_base_commission_rate;
  v_floor_commission_amount := v_base_commission_amount;
  v_floor_comp_level := v_base_comp_level;

  FOR v_upline_record IN (
    WITH RECURSIVE upline_chain AS (
      SELECT up.id as upline_id, up.contract_level as upline_comp_level, 1 as depth
      FROM user_profiles up
      WHERE up.id = (SELECT upline_id FROM user_profiles WHERE id = NEW.user_id)
        AND up.id IS NOT NULL AND up.contract_level IS NOT NULL
      UNION
      SELECT up.id, up.contract_level, uc.depth + 1
      FROM user_profiles up
      JOIN upline_chain uc ON up.id = (SELECT upline_id FROM user_profiles WHERE id = uc.upline_id)
      WHERE up.id IS NOT NULL AND up.contract_level IS NOT NULL
    )
    SELECT * FROM upline_chain ORDER BY depth ASC
  ) LOOP
    IF v_upline_record.upline_comp_level <= v_floor_comp_level THEN
      CONTINUE;
    END IF;

    SELECT commission_percentage INTO v_upline_commission_rate
    FROM comp_guide
    WHERE carrier_id = NEW.carrier_id
      AND (product_id = NEW.product_id OR product_type = NEW.product)
      AND contract_level = v_upline_record.upline_comp_level
      AND effective_date <= NEW.effective_date
      AND (expiration_date IS NULL OR expiration_date >= NEW.effective_date)
    ORDER BY effective_date DESC LIMIT 1;

    IF v_upline_commission_rate IS NULL THEN
      CONTINUE;
    END IF;

    v_upline_commission_amount := NEW.annual_premium * v_upline_commission_rate;
    v_override_amount := v_upline_commission_amount - v_floor_commission_amount;

    IF v_override_amount > 0 THEN
      INSERT INTO override_commissions (
        policy_id, base_agent_id, override_agent_id, hierarchy_depth,
        base_comp_level, override_comp_level, carrier_id, product_id,
        policy_premium, base_commission_amount, override_commission_amount,
        advance_months, months_paid, earned_amount, unearned_amount,
        status, created_at
      ) VALUES (
        NEW.id, NEW.user_id, v_upline_record.upline_id, v_upline_record.depth,
        v_base_comp_level, v_upline_record.upline_comp_level,
        NEW.carrier_id, NEW.product_id, NEW.annual_premium,
        v_base_commission_amount, v_override_amount,
        9, 0, 0, v_override_amount, 'pending', NOW()
      );
      v_floor_commission_amount := v_upline_commission_amount;
      v_floor_comp_level := v_upline_record.upline_comp_level;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PART 4: Recreate original INSERT trigger
-- ============================================================================

CREATE TRIGGER trigger_create_override_commissions
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION create_override_commissions();

-- ============================================================================
-- PART 5: Log completion
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Revert complete. Original trigger restored. Deleted data cannot be recovered.';
END $$;
