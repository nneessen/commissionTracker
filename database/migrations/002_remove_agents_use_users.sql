-- /home/nneessen/projects/commissionTracker/database/migrations/002_remove_agents_use_users.sql
-- Migration to remove agents table and use auth.users instead

-- Step 1: Add agent-specific columns to auth.users metadata
-- We'll use the raw_user_meta_data field in auth.users which is a JSONB field

-- Step 2: Create a public view for user information that includes agent data
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

-- Step 3: Create a function to update user metadata
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

-- Step 4: Migrate existing agent data to auth.users (if any exist)
-- First, check if there are any agents to migrate
DO $$
DECLARE
    agent_record RECORD;
BEGIN
    -- Check if agents table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'agents') THEN
        -- For each agent, try to find matching user or create one
        FOR agent_record IN SELECT * FROM agents
        LOOP
            -- If user doesn't exist with this email, insert into auth.users
            IF agent_record.email IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM auth.users WHERE email = agent_record.email
            ) THEN
                -- Note: In production, you'd use Supabase Auth API to create users
                -- This is just for migration purposes
                INSERT INTO auth.users (
                    id,
                    email,
                    raw_user_meta_data,
                    created_at,
                    updated_at
                ) VALUES (
                    agent_record.id,
                    agent_record.email,
                    jsonb_build_object(
                        'full_name', agent_record.name,
                        'phone', agent_record.phone,
                        'contract_comp_level', agent_record.contract_comp_level,
                        'is_active', agent_record.is_active,
                        'notes', agent_record.notes
                    ),
                    agent_record.created_at,
                    agent_record.updated_at
                );
            END IF;
        END LOOP;
    END IF;
END $$;

-- Step 5: Drop foreign key constraints that reference agents table
ALTER TABLE policies DROP CONSTRAINT IF EXISTS policies_agent_id_fkey;
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_agent_id_fkey;
ALTER TABLE expenses DROP CONSTRAINT IF EXISTS expenses_agent_id_fkey;
ALTER TABLE agent_settings DROP CONSTRAINT IF EXISTS agent_settings_agent_id_fkey;

-- Step 6: Add new foreign key constraints to reference auth.users
ALTER TABLE policies
    ADD CONSTRAINT policies_user_id_fkey
    FOREIGN KEY (agent_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE commissions
    ADD CONSTRAINT commissions_user_id_fkey
    FOREIGN KEY (agent_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE expenses
    ADD CONSTRAINT expenses_user_id_fkey
    FOREIGN KEY (agent_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- Step 7: Rename agent_id columns to user_id for clarity
ALTER TABLE policies RENAME COLUMN agent_id TO user_id;
ALTER TABLE commissions RENAME COLUMN agent_id TO user_id;
ALTER TABLE expenses RENAME COLUMN agent_id TO user_id;

-- Step 8: Drop the agent_settings and agents tables
DROP TABLE IF EXISTS agent_settings;
DROP TABLE IF EXISTS agents;

-- Step 9: Create RLS policies for the users view
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can view own data" ON auth.users
    FOR SELECT
    USING (auth.uid() = id);

-- Allow users to update their own metadata
CREATE POLICY "Users can update own metadata" ON auth.users
    FOR UPDATE
    USING (auth.uid() = id);

-- Step 10: Grant permissions
GRANT SELECT ON public.users TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_metadata TO authenticated;

-- Step 11: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);