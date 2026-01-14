-- Migration: Add password_set_at tracking for reminder automations
-- Purpose: Track when users set their password so we can send reminders before link expires

-- Step 1: Add password_set_at column to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient reminder queries (find users who haven't set password)
CREATE INDEX IF NOT EXISTS idx_user_profiles_password_pending
ON user_profiles (created_at)
WHERE password_set_at IS NULL;

COMMENT ON COLUMN user_profiles.password_set_at IS
'Timestamp when user first set their password via reset flow. NULL = password not yet set.';

-- Step 2: Add new automation trigger types for password reminders
ALTER TYPE pipeline_automation_trigger ADD VALUE IF NOT EXISTS 'password_not_set_24h';
ALTER TYPE pipeline_automation_trigger ADD VALUE IF NOT EXISTS 'password_not_set_12h';

-- Step 3: Update constraints to allow system-level triggers without phase/item
-- First drop the existing constraints
ALTER TABLE pipeline_automations DROP CONSTRAINT IF EXISTS automation_target_check;
ALTER TABLE pipeline_automations DROP CONSTRAINT IF EXISTS trigger_type_target_check;

-- Recreate constraints to include system triggers
ALTER TABLE pipeline_automations ADD CONSTRAINT automation_target_check CHECK (
  -- Phase triggers require phase_id
  (trigger_type IN ('phase_enter', 'phase_complete', 'phase_stall') AND phase_id IS NOT NULL AND checklist_item_id IS NULL) OR
  -- Item triggers require checklist_item_id
  (trigger_type IN ('item_complete', 'item_approval_needed', 'item_deadline_approaching') AND checklist_item_id IS NOT NULL AND phase_id IS NULL) OR
  -- System triggers don't require either (both NULL)
  (trigger_type IN ('password_not_set_24h', 'password_not_set_12h') AND phase_id IS NULL AND checklist_item_id IS NULL)
);

-- Step 4: Create RPC function to find users needing password reminders
CREATE OR REPLACE FUNCTION get_password_reminder_users(
  hours_since_creation INT  -- 48 for 24h-warning, 60 for 12h-warning
)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  phone TEXT,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id AS user_id,
    up.email,
    up.phone,
    up.first_name,
    up.last_name,
    up.created_at
  FROM user_profiles up
  WHERE up.password_set_at IS NULL
    AND up.created_at <= NOW() - (hours_since_creation || ' hours')::INTERVAL
    AND up.created_at > NOW() - INTERVAL '72 hours'  -- Still within valid window
    AND up.approval_status != 'denied'  -- Skip denied users
    AND up.archived_at IS NULL;  -- Skip archived users
END;
$$;

-- Grant execute to authenticated users (edge functions use service role anyway)
GRANT EXECUTE ON FUNCTION get_password_reminder_users(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_password_reminder_users(INT) TO service_role;
