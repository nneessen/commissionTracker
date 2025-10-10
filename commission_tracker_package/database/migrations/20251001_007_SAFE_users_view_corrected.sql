-- supabase/migrations/20251001_007_SAFE_users_view_corrected.sql
-- CORRECTED VERSION: Safe, idempotent migration to create users view
-- This version is safe to run multiple times and handles all edge cases
--
-- PURPOSE:
-- - Create public.users VIEW based on auth.users
-- - Map user metadata fields from JSONB to columns
-- - Replace old agents table concept with direct auth.users integration
--
-- SAFETY FEATURES:
-- - Handles both VIEW and TABLE scenarios
-- - Uses CREATE OR REPLACE for functions
-- - Checks for existing columns before renaming
-- - Safe to run multiple times (idempotent)

-- =====================================================
-- STEP 1: Drop existing users object (VIEW or TABLE)
-- =====================================================

-- Drop VIEW if it exists (most likely scenario)
DROP VIEW IF EXISTS public.users CASCADE;

-- Drop TABLE if it exists (legacy scenario)
DROP TABLE IF EXISTS public.users CASCADE;

-- =====================================================
-- STEP 2: Create users VIEW based on auth.users
-- =====================================================

CREATE OR REPLACE VIEW public.users AS
SELECT
    id,
    email,
    COALESCE(raw_user_meta_data->>'full_name', email) as name,
    raw_user_meta_data->>'phone' as phone,
    COALESCE((raw_user_meta_data->>'contract_comp_level')::INTEGER, 100) as contract_comp_level,
    COALESCE((raw_user_meta_data->>'is_active')::BOOLEAN, true) as is_active,
    raw_user_meta_data->>'agent_code' as agent_code,
    raw_user_meta_data->>'license_number' as license_number,
    raw_user_meta_data->>'license_state' as license_state,
    raw_user_meta_data->>'notes' as notes,
    created_at,
    updated_at
FROM auth.users;

COMMENT ON VIEW public.users IS 'Public view of auth.users with metadata fields extracted from JSONB';

-- =====================================================
-- STEP 3: Create or replace user metadata function
-- =====================================================

CREATE OR REPLACE FUNCTION public.update_user_metadata(
    user_id UUID,
    metadata JSONB
)
RETURNS void AS $$
BEGIN
    -- Only allow users to update their own metadata
    IF auth.uid() != user_id THEN
        RAISE EXCEPTION 'You can only update your own metadata';
    END IF;

    UPDATE auth.users
    SET
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || metadata,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_user_metadata IS 'Update user metadata in auth.users.raw_user_meta_data';

-- =====================================================
-- STEP 4: Migrate agent_id → user_id columns
-- =====================================================
-- This section safely renames agent_id to user_id across all tables
-- Only executes if the column exists and hasn't been renamed yet

-- For policies table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'policies'
          AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'policies'
          AND column_name = 'user_id'
    ) THEN
        -- Drop old constraint if exists
        ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_agent_id_fkey;

        -- Rename column
        ALTER TABLE policies RENAME COLUMN agent_id TO user_id;

        -- Add new constraint
        ALTER TABLE policies
            ADD CONSTRAINT policies_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

        -- Create index
        CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);

        RAISE NOTICE 'policies: Renamed agent_id to user_id';
    ELSE
        RAISE NOTICE 'policies: Column migration already complete or not applicable';
    END IF;
END $$;

-- For commissions table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'commissions'
          AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'commissions'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_agent_id_fkey;
        ALTER TABLE commissions RENAME COLUMN agent_id TO user_id;
        ALTER TABLE commissions
            ADD CONSTRAINT commissions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);

        RAISE NOTICE 'commissions: Renamed agent_id to user_id';
    ELSE
        RAISE NOTICE 'commissions: Column migration already complete or not applicable';
    END IF;
END $$;

-- For expenses table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'expenses'
          AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'expenses'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_agent_id_fkey;
        ALTER TABLE expenses RENAME COLUMN agent_id TO user_id;
        ALTER TABLE expenses
            ADD CONSTRAINT expenses_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);

        RAISE NOTICE 'expenses: Renamed agent_id to user_id';
    ELSE
        RAISE NOTICE 'expenses: Column migration already complete or not applicable';
    END IF;
END $$;

-- For carriers table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'carriers'
          AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'carriers'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE carriers DROP CONSTRAINT IF EXISTS carriers_agent_id_fkey;
        ALTER TABLE carriers RENAME COLUMN agent_id TO user_id;
        ALTER TABLE carriers
            ADD CONSTRAINT carriers_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_carriers_user_id ON carriers(user_id);

        RAISE NOTICE 'carriers: Renamed agent_id to user_id';
    ELSE
        RAISE NOTICE 'carriers: Column migration already complete or not applicable';
    END IF;
END $$;

-- For chargebacks table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'chargebacks'
          AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'chargebacks'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE chargebacks DROP CONSTRAINT IF EXISTS chargebacks_agent_id_fkey;
        ALTER TABLE chargebacks RENAME COLUMN agent_id TO user_id;
        ALTER TABLE chargebacks
            ADD CONSTRAINT chargebacks_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_chargebacks_user_id ON chargebacks(user_id);

        RAISE NOTICE 'chargebacks: Renamed agent_id to user_id';
    ELSE
        RAISE NOTICE 'chargebacks: Column migration already complete or not applicable';
    END IF;
END $$;

-- For comp_guide table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'comp_guide'
          AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'comp_guide'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE comp_guide DROP CONSTRAINT IF EXISTS comp_guide_agent_id_fkey;
        ALTER TABLE comp_guide RENAME COLUMN agent_id TO user_id;
        ALTER TABLE comp_guide
            ADD CONSTRAINT comp_guide_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_comp_guide_user_id ON comp_guide(user_id);

        RAISE NOTICE 'comp_guide: Renamed agent_id to user_id';
    ELSE
        RAISE NOTICE 'comp_guide: Column migration already complete or not applicable';
    END IF;
END $$;

-- For constants table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'constants'
          AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'constants'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE constants DROP CONSTRAINT IF EXISTS constants_agent_id_fkey;
        ALTER TABLE constants RENAME COLUMN agent_id TO user_id;
        ALTER TABLE constants
            ADD CONSTRAINT constants_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_constants_user_id ON constants(user_id);

        RAISE NOTICE 'constants: Renamed agent_id to user_id';
    ELSE
        RAISE NOTICE 'constants: Column migration already complete or not applicable';
    END IF;
END $$;

-- For settings table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'settings'
          AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'settings'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_agent_id_fkey;
        ALTER TABLE settings RENAME COLUMN agent_id TO user_id;
        ALTER TABLE settings
            ADD CONSTRAINT settings_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);

        RAISE NOTICE 'settings: Renamed agent_id to user_id';
    ELSE
        RAISE NOTICE 'settings: Column migration already complete or not applicable';
    END IF;
END $$;

-- For clients table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'clients'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_agent_id_fkey;
        ALTER TABLE clients RENAME COLUMN agent_id TO user_id;
        ALTER TABLE clients
            ADD CONSTRAINT clients_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);

        RAISE NOTICE 'clients: Renamed agent_id to user_id';
    ELSE
        RAISE NOTICE 'clients: Column migration already complete or not applicable';
    END IF;
END $$;

-- =====================================================
-- STEP 5: Drop old agent-related tables
-- =====================================================

DROP TABLE IF EXISTS agent_settings CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- =====================================================
-- STEP 6: Grant permissions
-- =====================================================

GRANT SELECT ON public.users TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_metadata TO authenticated;

-- =====================================================
-- STEP 7: Verification & Success Message
-- =====================================================

DO $$
DECLARE
    users_exists BOOLEAN;
    function_count INTEGER;
BEGIN
    -- Check if users view was created
    SELECT EXISTS (
        SELECT 1 FROM information_schema.views
        WHERE table_schema = 'public' AND table_name = 'users'
    ) INTO users_exists;

    -- Count migration functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name = 'update_user_metadata';

    -- Report results
    IF users_exists THEN
        RAISE NOTICE '✓ public.users VIEW created successfully';
    ELSE
        RAISE WARNING '✗ public.users VIEW was not created!';
    END IF;

    IF function_count > 0 THEN
        RAISE NOTICE '✓ update_user_metadata function created successfully';
    ELSE
        RAISE WARNING '✗ update_user_metadata function was not created!';
    END IF;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'Migration 007 completed successfully!';
    RAISE NOTICE 'All agent_id columns renamed to user_id (if applicable)';
    RAISE NOTICE 'Foreign keys and indexes created';
    RAISE NOTICE 'Old agents/agent_settings tables dropped';
    RAISE NOTICE '========================================';
END $$;
