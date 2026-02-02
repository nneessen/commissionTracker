-- Add slack_member_overrides to user_profiles for per-workspace Slack ID mapping
-- This allows users to have different Slack accounts in different workspaces

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS slack_member_overrides JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN user_profiles.slack_member_overrides IS 
'Maps integration_id -> {slack_member_id, display_name, avatar_url} for workspaces where email lookup fails';
