-- Safe version of migration 002: Remove agents table and use auth.users
-- This version checks for existing objects before creating/dropping them

-- Step 1: Drop existing users view/table if it exists (safely)
-- Handle both VIEW and TABLE cases (idempotent)
DROP VIEW IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Step 2: Create users view based on auth.users
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

-- Step 3: Create or replace function to update user metadata
CREATE OR REPLACE FUNCTION public.update_user_metadata(
    user_id UUID,
    metadata JSONB
)
RETURNS void AS $$
BEGIN
    UPDATE auth.users
    SET
        raw_user_meta_data = raw_user_meta_data || metadata,
        updated_at = NOW()
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Check if we need to rename agent_id to user_id
-- Only rename if column is called agent_id

-- For policies table
DO $$
BEGIN
    -- Check if agent_id exists and user_id doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies' AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'policies' AND column_name = 'user_id'
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
    END IF;
END $$;

-- For commissions table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'commissions' AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'commissions' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_agent_id_fkey;
        ALTER TABLE commissions RENAME COLUMN agent_id TO user_id;
        ALTER TABLE commissions
            ADD CONSTRAINT commissions_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
    END IF;
END $$;

-- For expenses table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenses' AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenses' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_agent_id_fkey;
        ALTER TABLE expenses RENAME COLUMN agent_id TO user_id;
        ALTER TABLE expenses
            ADD CONSTRAINT expenses_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
    END IF;
END $$;

-- For carriers table (if it has agent_id/user_id)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'carriers' AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'carriers' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE carriers DROP CONSTRAINT IF EXISTS carriers_agent_id_fkey;
        ALTER TABLE carriers RENAME COLUMN agent_id TO user_id;
        ALTER TABLE carriers
            ADD CONSTRAINT carriers_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_carriers_user_id ON carriers(user_id);
    END IF;
END $$;

-- For chargebacks table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chargebacks' AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'chargebacks' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE chargebacks DROP CONSTRAINT IF EXISTS chargebacks_agent_id_fkey;
        ALTER TABLE chargebacks RENAME COLUMN agent_id TO user_id;
        ALTER TABLE chargebacks
            ADD CONSTRAINT chargebacks_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_chargebacks_user_id ON chargebacks(user_id);
    END IF;
END $$;

-- For comp_guide table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'comp_guide' AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'comp_guide' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE comp_guide DROP CONSTRAINT IF EXISTS comp_guide_agent_id_fkey;
        ALTER TABLE comp_guide RENAME COLUMN agent_id TO user_id;
        ALTER TABLE comp_guide
            ADD CONSTRAINT comp_guide_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_comp_guide_user_id ON comp_guide(user_id);
    END IF;
END $$;

-- For constants table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'constants' AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'constants' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE constants DROP CONSTRAINT IF EXISTS constants_agent_id_fkey;
        ALTER TABLE constants RENAME COLUMN agent_id TO user_id;
        ALTER TABLE constants
            ADD CONSTRAINT constants_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_constants_user_id ON constants(user_id);
    END IF;
END $$;

-- For settings table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settings' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_agent_id_fkey;
        ALTER TABLE settings RENAME COLUMN agent_id TO user_id;
        ALTER TABLE settings
            ADD CONSTRAINT settings_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_settings_user_id ON settings(user_id);
    END IF;
END $$;

-- For clients table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'agent_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'clients' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_agent_id_fkey;
        ALTER TABLE clients RENAME COLUMN agent_id TO user_id;
        ALTER TABLE clients
            ADD CONSTRAINT clients_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
    END IF;
END $$;

-- Step 5: Drop agent-related tables if they exist
DROP TABLE IF EXISTS agent_settings CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- Step 6: Grant permissions
GRANT SELECT ON public.users TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_metadata TO authenticated;

-- Step 7: Success message
DO $$
BEGIN
    RAISE NOTICE 'Migration 002 completed successfully!';
    RAISE NOTICE 'All agent_id columns have been renamed to user_id where applicable.';
    RAISE NOTICE 'Foreign keys and indexes have been created.';
END $$;
