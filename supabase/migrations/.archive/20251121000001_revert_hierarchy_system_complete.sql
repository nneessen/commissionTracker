-- Migration: Complete Revert of Hierarchy System (migrations 001, 002, 003)
-- Purpose: Undo ALL changes made by hierarchy migrations and restore working state
-- Reverts: 20251121_001, 20251121_002, 20251121_003
-- Created: 2025-11-21

BEGIN;

-- ============================================
-- 1. DROP ALL VIEWS CREATED BY HIERARCHY MIGRATIONS
-- ============================================

DROP VIEW IF EXISTS override_commission_summary CASCADE;
DROP VIEW IF EXISTS downline_sales_performance CASCADE;
DROP VIEW IF EXISTS hierarchy_overview CASCADE;

-- ============================================
-- 2. DROP ALL TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS cascade_override_commissions ON commissions;
DROP TRIGGER IF EXISTS update_overrides_on_policy_status ON policies;
DROP TRIGGER IF EXISTS update_hierarchy_path_trigger ON user_profiles;
DROP TRIGGER IF EXISTS check_circular_reference_trigger ON user_profiles;
DROP TRIGGER IF EXISTS generate_agent_code_trigger ON user_profiles;

-- ============================================
-- 3. DROP ALL FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS create_override_commissions() CASCADE;
DROP FUNCTION IF EXISTS update_override_commissions_on_policy_change() CASCADE;
DROP FUNCTION IF EXISTS update_hierarchy_path() CASCADE;
DROP FUNCTION IF EXISTS check_no_circular_reference() CASCADE;
DROP FUNCTION IF EXISTS get_downline_tree(UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_agent_code() CASCADE;

-- ============================================
-- 4. DROP HIERARCHY_INVITES TABLE
-- ============================================

DROP TABLE IF EXISTS hierarchy_invites CASCADE;

-- ============================================
-- 5. REMOVE COLUMNS FROM COMMISSIONS TABLE
-- ============================================

ALTER TABLE commissions DROP COLUMN IF EXISTS is_override;
ALTER TABLE commissions DROP COLUMN IF EXISTS original_policy_id;
ALTER TABLE commissions DROP COLUMN IF EXISTS selling_agent_id;
ALTER TABLE commissions DROP COLUMN IF EXISTS override_percentage;
ALTER TABLE commissions DROP COLUMN IF EXISTS override_level;
ALTER TABLE commissions DROP COLUMN IF EXISTS rate;

-- Drop indexes that were created for override queries
DROP INDEX IF EXISTS idx_commissions_is_override;
DROP INDEX IF EXISTS idx_commissions_selling_agent;
DROP INDEX IF EXISTS idx_commissions_original_policy;
DROP INDEX IF EXISTS idx_commissions_override_level;

-- ============================================
-- 6. REMOVE COLUMNS FROM USER_PROFILES TABLE
-- ============================================

ALTER TABLE user_profiles DROP COLUMN IF EXISTS upline_id;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS hierarchy_path;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS hierarchy_level;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS agent_code;

-- Drop indexes that were created for hierarchy
DROP INDEX IF EXISTS idx_user_profiles_upline;
DROP INDEX IF EXISTS idx_user_profiles_hierarchy_path;
DROP INDEX IF EXISTS idx_user_profiles_agent_code;

-- ============================================
-- 7. DROP ALL POLICIES ON USER_PROFILES AND RESTORE WORKING STATE
-- ============================================

-- Drop ALL policies (including the broken ones from my migrations)
DROP POLICY IF EXISTS "Users can view hierarchy" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own hierarchy" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage all hierarchy" ON user_profiles;
DROP POLICY IF EXISTS "Approved users can view downline" ON user_profiles;
DROP POLICY IF EXISTS "Approved users can update own hierarchy" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
DROP POLICY IF EXISTS "Users cannot update profiles" ON user_profiles;

-- Recreate the 3 working policies from 20251120150000_fix_user_profiles_rls.sql
-- These are the policies that were working BEFORE I broke everything

-- Policy 1: Users can view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Policy 2: Admins can view all profiles (checks auth.users.email directly to avoid recursion)
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'nick@nickneessen.com'
    )
  );

-- Policy 3: Admins can update any profile (checks auth.users.email directly to avoid recursion)
CREATE POLICY "Admins can update any profile" ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.email = 'nick@nickneessen.com'
    )
  );

-- ============================================
-- 8. DROP OVERRIDE COMMISSION RLS POLICY
-- ============================================

DROP POLICY IF EXISTS "Users can view downline override commissions" ON commissions;

COMMIT;

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Complete Hierarchy System Revert Done!';
    RAISE NOTICE '===========================================';
    RAISE NOTICE 'Reverted:';
    RAISE NOTICE '  - Dropped all hierarchy functions and triggers';
    RAISE NOTICE '  - Dropped hierarchy_invites table';
    RAISE NOTICE '  - Removed hierarchy columns from user_profiles';
    RAISE NOTICE '  - Removed override columns from commissions';
    RAISE NOTICE '  - Dropped all hierarchy views';
    RAISE NOTICE '';
    RAISE NOTICE 'Restored:';
    RAISE NOTICE '  - Exact 3 RLS policies from working state (20251120150000)';
    RAISE NOTICE '  - Admin access via auth.users.email check';
    RAISE NOTICE '';
    RAISE NOTICE 'Database is now back to state BEFORE hierarchy changes';
    RAISE NOTICE 'Admin should have full access now!';
    RAISE NOTICE '===========================================';
END $$;
