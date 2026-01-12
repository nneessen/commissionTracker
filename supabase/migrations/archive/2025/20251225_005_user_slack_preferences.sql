-- Migration: User Slack Preferences
-- Allows per-user configuration of:
--   1. Default channel to view when opening Slack tab
--   2. Additional channels to auto-post policy sales to
--   3. Toggle to enable/disable auto-posting

-- Create the table
CREATE TABLE IF NOT EXISTS user_slack_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- Default channel when viewing Slack tab
  default_view_channel_id TEXT,
  default_view_channel_name TEXT,

  -- Additional channels to post policies to (beyond IMO's master channel)
  -- Stored as array of channel IDs
  policy_post_channel_ids TEXT[] DEFAULT '{}',

  -- Store channel names for display (parallel array)
  policy_post_channel_names TEXT[] DEFAULT '{}',

  -- Toggle: enable/disable auto-posting for this user
  auto_post_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One preference record per user per IMO
  UNIQUE(user_id, imo_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_slack_preferences_user_id
  ON user_slack_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_slack_preferences_imo_id
  ON user_slack_preferences(imo_id);

-- Enable RLS
ALTER TABLE user_slack_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only manage their own preferences
CREATE POLICY "Users can view own slack preferences"
  ON user_slack_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own slack preferences"
  ON user_slack_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own slack preferences"
  ON user_slack_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own slack preferences"
  ON user_slack_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role bypass for edge functions
CREATE POLICY "Service role full access"
  ON user_slack_preferences
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_user_slack_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_slack_preferences_updated_at
  BEFORE UPDATE ON user_slack_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_slack_preferences_updated_at();

-- Add comment for documentation
COMMENT ON TABLE user_slack_preferences IS
  'Per-user Slack preferences including default view channel and policy auto-post channels';
