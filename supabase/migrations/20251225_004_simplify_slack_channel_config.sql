-- Migration: Simplify Slack Channel Configuration
-- Add direct channel settings to slack_integrations instead of using slack_channel_configs
-- This simplifies the UI: just pick one channel for policies, one for leaderboard

-- Add channel columns to slack_integrations
ALTER TABLE slack_integrations
ADD COLUMN IF NOT EXISTS policy_channel_id TEXT,
ADD COLUMN IF NOT EXISTS policy_channel_name TEXT,
ADD COLUMN IF NOT EXISTS leaderboard_channel_id TEXT,
ADD COLUMN IF NOT EXISTS leaderboard_channel_name TEXT,
ADD COLUMN IF NOT EXISTS include_client_info BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS include_leaderboard_with_policy BOOLEAN DEFAULT true;

-- Comment on new columns
COMMENT ON COLUMN slack_integrations.policy_channel_id IS 'Slack channel ID for policy sale notifications';
COMMENT ON COLUMN slack_integrations.policy_channel_name IS 'Slack channel name for policy sale notifications';
COMMENT ON COLUMN slack_integrations.leaderboard_channel_id IS 'Slack channel ID for daily leaderboard posts';
COMMENT ON COLUMN slack_integrations.leaderboard_channel_name IS 'Slack channel name for daily leaderboard posts';
COMMENT ON COLUMN slack_integrations.include_client_info IS 'Whether to include client name in policy notifications';
COMMENT ON COLUMN slack_integrations.include_leaderboard_with_policy IS 'Whether to include leaderboard with each policy notification';

-- Migrate existing config data to the new columns (if any exist)
-- Pick the first active policy_created config as the policy channel
UPDATE slack_integrations si
SET
  policy_channel_id = (
    SELECT channel_id FROM slack_channel_configs scc
    WHERE scc.slack_integration_id = si.id
    AND scc.notification_type = 'policy_created'
    AND scc.is_active = true
    AND scc.agency_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  ),
  policy_channel_name = (
    SELECT channel_name FROM slack_channel_configs scc
    WHERE scc.slack_integration_id = si.id
    AND scc.notification_type = 'policy_created'
    AND scc.is_active = true
    AND scc.agency_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  ),
  leaderboard_channel_id = (
    SELECT channel_id FROM slack_channel_configs scc
    WHERE scc.slack_integration_id = si.id
    AND scc.notification_type = 'daily_leaderboard'
    AND scc.is_active = true
    AND scc.agency_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  ),
  leaderboard_channel_name = (
    SELECT channel_name FROM slack_channel_configs scc
    WHERE scc.slack_integration_id = si.id
    AND scc.notification_type = 'daily_leaderboard'
    AND scc.is_active = true
    AND scc.agency_id IS NULL
    ORDER BY created_at ASC
    LIMIT 1
  ),
  include_client_info = COALESCE(
    (
      SELECT include_client_info FROM slack_channel_configs scc
      WHERE scc.slack_integration_id = si.id
      AND scc.notification_type = 'policy_created'
      AND scc.is_active = true
      AND scc.agency_id IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    ),
    false
  ),
  include_leaderboard_with_policy = COALESCE(
    (
      SELECT include_leaderboard FROM slack_channel_configs scc
      WHERE scc.slack_integration_id = si.id
      AND scc.notification_type = 'policy_created'
      AND scc.is_active = true
      AND scc.agency_id IS NULL
      ORDER BY created_at ASC
      LIMIT 1
    ),
    true
  )
WHERE si.is_active = true;

-- If leaderboard channel is null, default to same as policy channel
UPDATE slack_integrations
SET leaderboard_channel_id = policy_channel_id,
    leaderboard_channel_name = policy_channel_name
WHERE leaderboard_channel_id IS NULL AND policy_channel_id IS NOT NULL;
