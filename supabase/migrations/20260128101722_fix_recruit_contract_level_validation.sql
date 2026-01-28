-- supabase/migrations/20260128101722_fix_recruit_contract_level_validation.sql
-- Fix: Allow recruits to be created without contract_level validation blocking upline assignment

-- ============================================================================
-- PART 1: Drop the hierarchy contract level validation trigger
-- This trigger was blocking upline_id assignment when contract levels are equal
-- Error: "Invalid hierarchy: Upline contract level (80) must be higher than downline contract level (80)"
-- ============================================================================

-- Drop the validation trigger if it exists (may have been created directly in DB)
DROP TRIGGER IF EXISTS validate_hierarchy_contract_levels_trigger ON user_profiles;
DROP TRIGGER IF EXISTS trigger_validate_hierarchy_contract_levels ON user_profiles;

-- Also drop the function if it exists
DROP FUNCTION IF EXISTS validate_hierarchy_contract_levels() CASCADE;

-- ============================================================================
-- PART 2: Modify ensure_valid_contract_level to allow NULL for recruits
-- Recruits don't earn commissions, so they don't need contract_level validation
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_valid_contract_level()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow NULL contract_level for recruits (they don't earn commissions)
  -- Only enforce contract_level for users with agent role
  IF NEW.contract_level IS NULL OR NEW.contract_level = 0 THEN
    -- Check if user has agent role (not just recruit)
    IF NEW.roles IS NOT NULL AND
       (NEW.roles @> ARRAY['agent']::text[] OR
        NEW.roles @> ARRAY['agency_owner']::text[] OR
        NEW.roles @> ARRAY['imo_admin']::text[] OR
        NEW.roles @> ARRAY['imo_manager']::text[]) THEN
      -- Agent-type users need a valid contract_level
      NEW.contract_level := COALESCE(NEW.contract_level, 80);
      IF NEW.contract_level = 0 THEN
        NEW.contract_level := 80;
      END IF;
    END IF;
    -- Recruits and other roles can have NULL contract_level
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION ensure_valid_contract_level() IS
'Ensures contract_level is valid for agent-type users (defaults to 80).
Allows NULL contract_level for recruits since they do not earn commissions.';

-- ============================================================================
-- PART 3: Reset contract_level to NULL for existing recruits
-- This allows them to be properly assigned uplines without validation issues
-- ============================================================================

-- Set contract_level to NULL for users who are only recruits (no agent role)
UPDATE user_profiles
SET contract_level = NULL
WHERE roles @> ARRAY['recruit']::text[]
  AND NOT (roles @> ARRAY['agent']::text[] OR
           roles @> ARRAY['agency_owner']::text[] OR
           roles @> ARRAY['imo_admin']::text[] OR
           roles @> ARRAY['imo_manager']::text[]);

-- Log how many were updated
DO $$
DECLARE
  v_updated_count int;
BEGIN
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Set contract_level to NULL for % recruits', v_updated_count;
END;
$$;
