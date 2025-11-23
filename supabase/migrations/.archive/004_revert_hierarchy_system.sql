-- Migration: Complete Revert of Hierarchy System
-- Purpose: Undo ALL changes made by hierarchy migrations
-- Created: 2025-11-21

BEGIN;

-- ============================================
-- 1. DROP ALL VIEWS
-- ============================================

DROP VIEW IF EXISTS override_commission_summary CASCADE;
DROP VIEW IF EXISTS downline_sales_performance CASCADE;
DROP VIEW IF EXISTS hierarchy_overview CASCADE;

-- ============================================
-- 2. DROP ALL TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS cascade_override_commissions ON commissions;
DROP TRIGGER IF EXISTS update_overrides_on_policy_status ON policies;

-- Only drop user_profiles triggers if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    DROP TRIGGER IF EXISTS update_hierarchy_path_trigger ON user_profiles;
    DROP TRIGGER IF EXISTS check_circular_reference_trigger ON user_profiles;
    DROP TRIGGER IF EXISTS generate_agent_code_trigger ON user_profiles;
  END IF;
END $$;

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
-- 5. DROP INDEXES ON COMMISSIONS
-- ============================================

DROP INDEX IF EXISTS idx_commissions_is_override;
DROP INDEX IF EXISTS idx_commissions_selling_agent;
DROP INDEX IF EXISTS idx_commissions_original_policy;
DROP INDEX IF EXISTS idx_commissions_override_level;

-- ============================================
-- 6. REMOVE COLUMNS FROM COMMISSIONS TABLE WITH CASCADE
-- ============================================
-- CASCADE will automatically drop the "Users can view downline override commissions" policy

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'is_override'
  ) THEN
    EXECUTE 'ALTER TABLE commissions DROP COLUMN is_override CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'original_policy_id'
  ) THEN
    EXECUTE 'ALTER TABLE commissions DROP COLUMN original_policy_id CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'selling_agent_id'
  ) THEN
    EXECUTE 'ALTER TABLE commissions DROP COLUMN selling_agent_id CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'override_percentage'
  ) THEN
    EXECUTE 'ALTER TABLE commissions DROP COLUMN override_percentage CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'override_level'
  ) THEN
    EXECUTE 'ALTER TABLE commissions DROP COLUMN override_level CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commissions' AND column_name = 'rate'
  ) THEN
    EXECUTE 'ALTER TABLE commissions DROP COLUMN rate CASCADE';
  END IF;
END $$;

-- ============================================
-- 7. DROP ALL REMAINING POLICIES ON COMMISSIONS
-- ============================================

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname
        FROM pg_policies
        WHERE tablename = 'commissions'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || pol.policyname || '" ON commissions';
    END LOOP;
END $$;

-- ============================================
-- 8. RECREATE ORIGINAL POLICIES
-- ============================================

-- For now, use simple auth check (is_user_approved function will be created in later migrations)
CREATE POLICY "Users can view own commissions" ON commissions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own commissions" ON commissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own commissions" ON commissions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own commissions" ON commissions
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- 9. DROP INDEXES ON USER_PROFILES
-- ============================================

-- Only drop indexes if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    DROP INDEX IF EXISTS idx_user_profiles_upline;
    DROP INDEX IF EXISTS idx_user_profiles_hierarchy_path;
    DROP INDEX IF EXISTS idx_user_profiles_agent_code;
  END IF;
END $$;

-- ============================================
-- 10. REMOVE COLUMNS FROM USER_PROFILES TABLE WITH CASCADE
-- ============================================

DO $$
BEGIN
  -- Check if user_profiles table exists first
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_profiles' AND column_name = 'upline_id'
    ) THEN
      EXECUTE 'ALTER TABLE user_profiles DROP COLUMN upline_id CASCADE';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_profiles' AND column_name = 'hierarchy_path'
    ) THEN
      EXECUTE 'ALTER TABLE user_profiles DROP COLUMN hierarchy_path CASCADE';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_profiles' AND column_name = 'hierarchy_level'
    ) THEN
      EXECUTE 'ALTER TABLE user_profiles DROP COLUMN hierarchy_level CASCADE';
    END IF;

    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'user_profiles' AND column_name = 'agent_code'
    ) THEN
      EXECUTE 'ALTER TABLE user_profiles DROP COLUMN agent_code CASCADE';
    END IF;
  END IF;
END $$;

-- ============================================
-- 11. DROP AND RECREATE USER_PROFILES POLICIES (if table exists)
-- ============================================

DO $$
BEGIN
  -- Only manage user_profiles policies if the table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    -- Drop all policies
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

    -- Recreate working policies
    CREATE POLICY "Users can view own profile" ON user_profiles
      FOR SELECT
      USING (auth.uid() = id);

    CREATE POLICY "Admins can view all profiles" ON user_profiles
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.email = 'nick@nickneessen.com'
        )
      );

    CREATE POLICY "Admins can update any profile" ON user_profiles
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM auth.users
          WHERE auth.users.id = auth.uid()
          AND auth.users.email = 'nick@nickneessen.com'
        )
      );
  END IF;
END $$;

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
    RAISE NOTICE 'Database restored to working state';
    RAISE NOTICE 'Admin should have full access now!';
    RAISE NOTICE '===========================================';
END $$;
