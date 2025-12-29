-- supabase/migrations/20251229_004_create_override_commissions_trigger.sql
-- CRITICAL FIX: The create_override_commissions() function exists but was never attached to a trigger
-- This migration creates the missing trigger to generate override commissions when policies are created

-- ============================================================================
-- PART 1: Create the missing trigger on policies table
-- ============================================================================

-- Drop if exists (idempotent)
DROP TRIGGER IF EXISTS trigger_create_override_commissions ON policies;

-- Create the trigger that calls create_override_commissions() after policy insert
-- This function already exists in 20251219_005_fix_hierarchy_override_spread.sql
CREATE TRIGGER trigger_create_override_commissions
  AFTER INSERT ON policies
  FOR EACH ROW
  EXECUTE FUNCTION create_override_commissions();

-- ============================================================================
-- PART 2: Add comment documenting the trigger
-- ============================================================================

COMMENT ON TRIGGER trigger_create_override_commissions ON policies IS
'Creates override commission records for all upline agents when a new policy is inserted.
The create_override_commissions() function:
1. Gets the policy writer''s contract_level from user_profiles
2. Looks up commission rates from comp_guide for each hierarchy level
3. Calculates spread between each level (floor-based - each upline gets spread to level directly below)
4. Inserts override_commissions records for each upline with positive spread
Added: 2024-12-29 - This trigger was missing, causing override commissions to not be created.';
