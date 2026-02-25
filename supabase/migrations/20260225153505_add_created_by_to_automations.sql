-- ============================================================================
-- Add created_by column to pipeline_automations
-- ============================================================================
-- Tracks which user created the automation. Used to resolve sender identity
-- when sender_type is 'trainer' or 'contracting_manager' — allows sending
-- emails from the creator's connected Gmail account.
-- ============================================================================

ALTER TABLE pipeline_automations
ADD COLUMN created_by UUID DEFAULT auth.uid() REFERENCES auth.users(id);

-- Backfill existing automations: set created_by to the first super admin
-- (these were all created by admins before staff had access)
UPDATE pipeline_automations
SET created_by = (
  SELECT id FROM user_profiles WHERE is_super_admin = true LIMIT 1
)
WHERE created_by IS NULL;

-- Add index for lookups
CREATE INDEX IF NOT EXISTS idx_pipeline_automations_created_by
ON pipeline_automations(created_by);

COMMENT ON COLUMN pipeline_automations.created_by IS 'User who created this automation. Used to resolve sender identity for Gmail routing.';

-- Track version
INSERT INTO supabase_migrations.function_versions (function_name, current_version, updated_at)
VALUES ('automation_created_by', '20260225153505', NOW())
ON CONFLICT (function_name) DO UPDATE SET
  current_version = EXCLUDED.current_version,
  updated_at = NOW();
