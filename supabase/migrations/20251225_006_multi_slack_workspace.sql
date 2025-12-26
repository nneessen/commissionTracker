-- Migration: Multi-Slack Workspace Support
-- Enables an IMO to connect multiple Slack workspaces and allows users
-- to configure channels across different workspaces.

-- ============================================================
-- STEP 1: Update slack_integrations table
-- ============================================================

-- Remove the unique constraint on imo_id to allow multiple workspaces per IMO
-- Note: The team_id unique constraint remains to prevent the same workspace
-- from being connected twice
ALTER TABLE slack_integrations
  DROP CONSTRAINT IF EXISTS slack_integrations_imo_unique;

-- Add display_name column for user-friendly workspace identification
-- Defaults to team_name but can be customized (e.g., "Sales Team Workspace")
ALTER TABLE slack_integrations
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Populate display_name from team_name for existing integrations
UPDATE slack_integrations
SET display_name = team_name
WHERE display_name IS NULL;

-- ============================================================
-- STEP 2: Update user_slack_preferences for multi-workspace channels
-- ============================================================

-- Add new JSONB column for workspace-aware channel selections
-- Format: [{ "integration_id": "uuid", "channel_id": "C123", "channel_name": "sales" }, ...]
ALTER TABLE user_slack_preferences
  ADD COLUMN IF NOT EXISTS policy_post_channels JSONB DEFAULT '[]'::jsonb;

-- Add column for default view channel with integration reference
ALTER TABLE user_slack_preferences
  ADD COLUMN IF NOT EXISTS default_view_integration_id UUID REFERENCES slack_integrations(id) ON DELETE SET NULL;

-- ============================================================
-- STEP 3: Migrate existing data to new format
-- ============================================================

-- Migrate existing policy_post_channel_ids to the new JSONB format
-- Links each channel to the IMO's existing integration
DO $$
DECLARE
  pref_record RECORD;
  integration_id UUID;
  channel_ids TEXT[];
  channel_names TEXT[];
  new_channels JSONB;
  i INTEGER;
BEGIN
  FOR pref_record IN
    SELECT id, imo_id, policy_post_channel_ids, policy_post_channel_names
    FROM user_slack_preferences
    WHERE policy_post_channel_ids IS NOT NULL
      AND array_length(policy_post_channel_ids, 1) > 0
  LOOP
    -- Find the integration for this IMO (use the first active one)
    SELECT si.id INTO integration_id
    FROM slack_integrations si
    WHERE si.imo_id = pref_record.imo_id
      AND si.is_active = true
      AND si.connection_status = 'connected'
    LIMIT 1;

    IF integration_id IS NOT NULL THEN
      channel_ids := pref_record.policy_post_channel_ids;
      channel_names := COALESCE(pref_record.policy_post_channel_names, ARRAY[]::TEXT[]);
      new_channels := '[]'::jsonb;

      FOR i IN 1..array_length(channel_ids, 1) LOOP
        new_channels := new_channels || jsonb_build_object(
          'integration_id', integration_id,
          'channel_id', channel_ids[i],
          'channel_name', COALESCE(channel_names[i], '')
        );
      END LOOP;

      UPDATE user_slack_preferences
      SET policy_post_channels = new_channels,
          default_view_integration_id = integration_id
      WHERE id = pref_record.id;
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- STEP 4: Drop old columns (now migrated)
-- ============================================================

ALTER TABLE user_slack_preferences
  DROP COLUMN IF EXISTS policy_post_channel_ids;

ALTER TABLE user_slack_preferences
  DROP COLUMN IF EXISTS policy_post_channel_names;

-- ============================================================
-- STEP 5: Add helpful indexes
-- ============================================================

-- Composite index for finding all active integrations for an IMO
CREATE INDEX IF NOT EXISTS idx_slack_integrations_imo_active_status
  ON slack_integrations(imo_id, is_active, connection_status);

-- Index for JSONB channel lookups (GIN index for contains queries)
CREATE INDEX IF NOT EXISTS idx_user_slack_prefs_channels
  ON user_slack_preferences USING GIN (policy_post_channels);

-- ============================================================
-- STEP 6: Add comments for documentation
-- ============================================================

COMMENT ON COLUMN slack_integrations.display_name IS
  'User-friendly name for the workspace, defaults to team_name';

COMMENT ON COLUMN user_slack_preferences.policy_post_channels IS
  'JSONB array of {integration_id, channel_id, channel_name} for multi-workspace channel selections';

COMMENT ON COLUMN user_slack_preferences.default_view_integration_id IS
  'Reference to the integration for the default view channel';
