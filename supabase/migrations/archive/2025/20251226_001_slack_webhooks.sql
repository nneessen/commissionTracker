-- Migration: Add slack_webhooks table for multi-workspace notifications
-- Date: 2025-12-26
-- Purpose: Allow users to add unlimited Slack webhooks for policy notifications
--          without OAuth complexity

-- Create slack_webhooks table
CREATE TABLE IF NOT EXISTS slack_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  webhook_url TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  workspace_name TEXT,
  is_active BOOLEAN DEFAULT true,
  notifications_enabled BOOLEAN DEFAULT true,
  include_client_info BOOLEAN DEFAULT false,
  include_leaderboard BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_slack_webhooks_imo_id ON slack_webhooks(imo_id);
CREATE INDEX IF NOT EXISTS idx_slack_webhooks_active ON slack_webhooks(imo_id, is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE slack_webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view webhooks for their IMO
CREATE POLICY "Users can view webhooks for their IMO"
  ON slack_webhooks FOR SELECT
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can insert webhooks for their IMO
CREATE POLICY "Users can insert webhooks for their IMO"
  ON slack_webhooks FOR INSERT
  WITH CHECK (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can update webhooks for their IMO
CREATE POLICY "Users can update webhooks for their IMO"
  ON slack_webhooks FOR UPDATE
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Users can delete webhooks for their IMO
CREATE POLICY "Users can delete webhooks for their IMO"
  ON slack_webhooks FOR DELETE
  USING (
    imo_id IN (
      SELECT imo_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_slack_webhooks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER slack_webhooks_updated_at
  BEFORE UPDATE ON slack_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_webhooks_updated_at();

-- Comment on table
COMMENT ON TABLE slack_webhooks IS 'Slack incoming webhooks for policy notifications - bypasses OAuth for multi-workspace support';
COMMENT ON COLUMN slack_webhooks.webhook_url IS 'Slack incoming webhook URL (https://hooks.slack.com/services/...)';
COMMENT ON COLUMN slack_webhooks.channel_name IS 'User-entered channel name for display (e.g., #sales)';
COMMENT ON COLUMN slack_webhooks.workspace_name IS 'User-entered workspace name for display (optional)';
