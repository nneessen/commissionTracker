-- supabase/migrations/20251001_008_SAFE_rls_policies.sql
-- CORRECTED VERSION: Safe, idempotent RLS policy setup
-- Replaces migrations 003 and 005 with a single safe version
--
-- PURPOSE:
-- - Enable RLS on all tables
-- - Create user-specific policies for tables with user_id
-- - Create authenticated-user policies for shared tables
--
-- SAFETY:
-- - Uses DROP POLICY IF EXISTS before CREATE
-- - Safe to run multiple times
-- - Handles missing tables gracefully

-- =====================================================
-- HELPER FUNCTION: Safely create policy
-- =====================================================

CREATE OR REPLACE FUNCTION create_policy_if_not_exists(
    policy_name TEXT,
    table_name TEXT,
    policy_command TEXT,
    policy_using TEXT,
    policy_check TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    -- Drop existing policy if exists
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, table_name);

    -- Create new policy
    IF policy_check IS NULL THEN
        EXECUTE format('CREATE POLICY %I ON %I FOR %s USING (%s)',
            policy_name, table_name, policy_command, policy_using);
    ELSE
        EXECUTE format('CREATE POLICY %I ON %I FOR %s USING (%s) WITH CHECK (%s)',
            policy_name, table_name, policy_command, policy_using, policy_check);
    END IF;

    RAISE NOTICE 'Created policy: % on table %', policy_name, table_name;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table % does not exist, skipping policy %', table_name, policy_name;
    WHEN OTHERS THEN
        RAISE WARNING 'Error creating policy % on %: %', policy_name, table_name, SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 1: Enable RLS on all tables (idempotent)
-- =====================================================

DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'carriers', 'commissions', 'policies', 'expenses',
        'clients', 'comp_guide', 'constants', 'chargebacks', 'settings'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
            RAISE NOTICE 'Enabled RLS on table: %', tbl;
        EXCEPTION
            WHEN undefined_table THEN
                RAISE NOTICE 'Table % does not exist, skipping RLS enable', tbl;
            WHEN OTHERS THEN
                RAISE WARNING 'Error enabling RLS on %: %', tbl, SQLERRM;
        END;
    END LOOP;
END $$;

-- =====================================================
-- STEP 2: Drop all old policies (cleanup)
-- =====================================================

DO $$
DECLARE
    old_policies TEXT[] := ARRAY[
        'Enable all for carriers',
        'Enable all for commissions',
        'Enable all for policies',
        'Enable all for expenses',
        'Enable all for clients',
        'Enable all for comp_guide',
        'Enable all for constants',
        'Enable all for chargebacks',
        'Enable all for settings',
        'Users can read carriers',
        'Users can insert carriers',
        'Users can update carriers',
        'Users can delete carriers',
        'Users can read own commissions',
        'Users can insert own commissions',
        'Users can update own commissions',
        'Users can delete own commissions',
        'Users can read commissions',
        'Users can insert commissions',
        'Users can update commissions',
        'Users can delete commissions',
        'Users can view own commissions',
        'Users can create own commissions',
        'Users can read policies',
        'Users can insert policies',
        'Users can update policies',
        'Users can delete policies',
        'Users can view own policies',
        'Users can create own policies',
        'Users can read own expenses',
        'Users can insert own expenses',
        'Users can update own expenses',
        'Users can delete own expenses',
        'Users can view own expenses',
        'Users can create own expenses',
        'Users can read clients',
        'Users can insert clients',
        'Users can update clients',
        'Users can delete clients',
        'Users can view own clients',
        'Users can create own clients',
        'Users can read comp_guide',
        'Users can insert comp_guide',
        'Users can update comp_guide',
        'Users can delete comp_guide',
        'Authenticated users can read comp_guide',
        'Authenticated users can manage comp_guide',
        'Users can read constants',
        'Users can insert constants',
        'Users can update constants',
        'Authenticated users can read constants',
        'Authenticated users can manage constants',
        'Users can read chargebacks',
        'Users can insert chargebacks',
        'Users can update chargebacks',
        'Users can delete chargebacks',
        'Authenticated users can manage chargebacks',
        'Users can read own settings',
        'Users can insert own settings',
        'Users can update own settings',
        'Users can delete own settings',
        'Users can view own settings',
        'Users can create own settings'
    ];
    policy_name TEXT;
    table_name TEXT;
    tables TEXT[] := ARRAY['carriers', 'commissions', 'policies', 'expenses', 'clients', 'comp_guide', 'constants', 'chargebacks', 'settings'];
    tbl TEXT;
BEGIN
    FOREACH policy_name IN ARRAY old_policies
    LOOP
        FOREACH tbl IN ARRAY tables
        LOOP
            BEGIN
                EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, tbl);
            EXCEPTION
                WHEN undefined_table THEN
                    -- Table doesn't exist, skip
                    NULL;
                WHEN undefined_object THEN
                    -- Policy doesn't exist, skip
                    NULL;
            END;
        END LOOP;
    END LOOP;
    RAISE NOTICE 'Cleaned up old policies';
END $$;

-- =====================================================
-- STEP 3: Create new RLS policies
-- =====================================================

-- COMMISSIONS TABLE - User-specific (has user_id)
-- Users can only access their own commissions

SELECT create_policy_if_not_exists(
    'Users can view own commissions',
    'commissions',
    'SELECT',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can create own commissions',
    'commissions',
    'INSERT',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can update own commissions',
    'commissions',
    'UPDATE',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can delete own commissions',
    'commissions',
    'DELETE',
    'auth.uid() = user_id'
);

-- POLICIES TABLE - User-specific (has user_id)

SELECT create_policy_if_not_exists(
    'Users can view own policies',
    'policies',
    'SELECT',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can create own policies',
    'policies',
    'INSERT',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can update own policies',
    'policies',
    'UPDATE',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can delete own policies',
    'policies',
    'DELETE',
    'auth.uid() = user_id'
);

-- EXPENSES TABLE - User-specific (has user_id)

SELECT create_policy_if_not_exists(
    'Users can view own expenses',
    'expenses',
    'SELECT',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can create own expenses',
    'expenses',
    'INSERT',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can update own expenses',
    'expenses',
    'UPDATE',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can delete own expenses',
    'expenses',
    'DELETE',
    'auth.uid() = user_id'
);

-- CLIENTS TABLE - User-specific (has user_id)

SELECT create_policy_if_not_exists(
    'Users can view own clients',
    'clients',
    'SELECT',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can create own clients',
    'clients',
    'INSERT',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can update own clients',
    'clients',
    'UPDATE',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can delete own clients',
    'clients',
    'DELETE',
    'auth.uid() = user_id'
);

-- SETTINGS TABLE - User-specific (has user_id)

SELECT create_policy_if_not_exists(
    'Users can view own settings',
    'settings',
    'SELECT',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can create own settings',
    'settings',
    'INSERT',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can update own settings',
    'settings',
    'UPDATE',
    'auth.uid() = user_id',
    'auth.uid() = user_id'
);

SELECT create_policy_if_not_exists(
    'Users can delete own settings',
    'settings',
    'DELETE',
    'auth.uid() = user_id'
);

-- CARRIERS TABLE - Shared (no user_id)
-- All authenticated users can manage

SELECT create_policy_if_not_exists(
    'Authenticated users can manage carriers',
    'carriers',
    'ALL',
    'auth.role() = ''authenticated''',
    'auth.role() = ''authenticated'''
);

-- COMP_GUIDE TABLE - Shared (no user_id)
-- All authenticated users can read, manage

SELECT create_policy_if_not_exists(
    'Authenticated users can read comp_guide',
    'comp_guide',
    'SELECT',
    'auth.role() = ''authenticated'''
);

SELECT create_policy_if_not_exists(
    'Authenticated users can manage comp_guide',
    'comp_guide',
    'ALL',
    'auth.role() = ''authenticated''',
    'auth.role() = ''authenticated'''
);

-- CHARGEBACKS TABLE - Shared or user-specific?
-- Keeping it permissive for now (all authenticated users)

SELECT create_policy_if_not_exists(
    'Authenticated users can manage chargebacks',
    'chargebacks',
    'ALL',
    'auth.role() = ''authenticated''',
    'auth.role() = ''authenticated'''
);

-- CONSTANTS TABLE - Shared (no user_id)
-- All authenticated users can read

SELECT create_policy_if_not_exists(
    'Authenticated users can read constants',
    'constants',
    'SELECT',
    'auth.role() = ''authenticated'''
);

SELECT create_policy_if_not_exists(
    'Authenticated users can manage constants',
    'constants',
    'ALL',
    'auth.role() = ''authenticated''',
    'auth.role() = ''authenticated'''
);

-- =====================================================
-- STEP 4: Cleanup helper function
-- =====================================================

DROP FUNCTION IF EXISTS create_policy_if_not_exists;

-- =====================================================
-- STEP 5: Verification
-- =====================================================

DO $$
DECLARE
    policy_count INTEGER;
    rls_count INTEGER;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'public';

    -- Count tables with RLS enabled
    SELECT COUNT(*) INTO rls_count
    FROM pg_tables
    WHERE schemaname = 'public'
      AND rowsecurity = true;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Migration Complete!';
    RAISE NOTICE 'Tables with RLS enabled: %', rls_count;
    RAISE NOTICE 'Total policies created: %', policy_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Policy Summary:';
    RAISE NOTICE '- Tables with user_id: User-specific isolation';
    RAISE NOTICE '  (commissions, policies, expenses, clients, settings)';
    RAISE NOTICE '- Shared tables: All authenticated users';
    RAISE NOTICE '  (carriers, comp_guide, chargebacks, constants)';
    RAISE NOTICE '========================================';
END $$;

-- Show created policies
SELECT
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
