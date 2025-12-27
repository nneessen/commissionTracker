-- supabase/migrations/20251225_001_slack_integration.sql
-- Slack integration for automated policy notifications and sales leaderboards

-- ============================================================================
-- ENUM: Slack notification types
-- ============================================================================

CREATE TYPE slack_notification_type AS ENUM (
  'policy_created',
  'policy_cancelled',
  'policy_renewed',
  'daily_leaderboard',
  'weekly_summary',
  'commission_milestone',
  'agent_achievement'
);

CREATE TYPE slack_connection_status AS ENUM (
  'connected',
  'disconnected',
  'error',
  'pending'
);

CREATE TYPE slack_message_status AS ENUM (
  'pending',
  'sent',
  'delivered',
  'failed',
  'retrying'
);

-- ============================================================================
-- Table: slack_integrations
-- Stores Slack workspace connection per IMO (one workspace per IMO)
-- ============================================================================

CREATE TABLE IF NOT EXISTS slack_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,

  -- OAuth tokens (encrypted using AES-256-GCM)
  access_token_encrypted TEXT NOT NULL,
  bot_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,

  -- Workspace info from Slack
  team_id TEXT NOT NULL,
  team_name TEXT NOT NULL,

  -- Bot info
  bot_user_id TEXT NOT NULL,
  bot_name TEXT DEFAULT 'The Standard HQ',

  -- OAuth metadata
  scope TEXT NOT NULL,
  token_type TEXT DEFAULT 'bot',
  authed_user_id TEXT,
  authed_user_email TEXT,

  -- Token management
  expires_at TIMESTAMPTZ,
  last_refresh_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  connection_status slack_connection_status NOT NULL DEFAULT 'pending',
  last_error TEXT,
  last_connected_at TIMESTAMPTZ DEFAULT now(),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT slack_integrations_imo_unique UNIQUE(imo_id),
  CONSTRAINT slack_integrations_team_unique UNIQUE(team_id)
);

-- ============================================================================
-- Table: slack_channel_configs
-- Maps agencies/notification types to Slack channels
-- ============================================================================

CREATE TABLE IF NOT EXISTS slack_channel_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  slack_integration_id UUID NOT NULL REFERENCES slack_integrations(id) ON DELETE CASCADE,

  -- Optional: scope to specific agency (null = all agencies in IMO)
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE,

  -- Channel info from Slack
  channel_id TEXT NOT NULL,
  channel_name TEXT NOT NULL,
  channel_type TEXT DEFAULT 'public' CHECK (channel_type IN ('public', 'private', 'dm')),

  -- Notification configuration
  notification_type slack_notification_type NOT NULL,

  -- Optional filters (e.g., {"min_premium": 5000, "carriers": ["uuid1", "uuid2"]})
  filter_config JSONB DEFAULT '{}',

  -- Message customization
  message_template JSONB,
  include_client_info BOOLEAN DEFAULT false,
  include_agent_photo BOOLEAN DEFAULT true,
  include_leaderboard BOOLEAN DEFAULT true,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Unique: one config per channel + notification type + agency
  CONSTRAINT slack_channel_configs_unique UNIQUE(imo_id, channel_id, notification_type, agency_id)
);

-- ============================================================================
-- Table: slack_messages
-- Audit trail for sent Slack messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  slack_integration_id UUID NOT NULL REFERENCES slack_integrations(id) ON DELETE CASCADE,
  channel_config_id UUID REFERENCES slack_channel_configs(id) ON DELETE SET NULL,

  -- Message details from Slack
  channel_id TEXT NOT NULL,
  message_ts TEXT,
  thread_ts TEXT,

  -- Content
  notification_type slack_notification_type NOT NULL,
  message_blocks JSONB,
  message_text TEXT,

  -- Related entities
  related_entity_type TEXT CHECK (related_entity_type IN ('policy', 'agent', 'leaderboard', 'commission')),
  related_entity_id UUID,

  -- Status tracking
  status slack_message_status NOT NULL DEFAULT 'pending',
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- slack_integrations
CREATE INDEX IF NOT EXISTS idx_slack_integrations_imo_id
  ON slack_integrations(imo_id);

CREATE INDEX IF NOT EXISTS idx_slack_integrations_team_id
  ON slack_integrations(team_id);

CREATE INDEX IF NOT EXISTS idx_slack_integrations_active
  ON slack_integrations(imo_id)
  WHERE is_active = true AND connection_status = 'connected';

-- slack_channel_configs
CREATE INDEX IF NOT EXISTS idx_slack_channel_configs_imo_id
  ON slack_channel_configs(imo_id);

CREATE INDEX IF NOT EXISTS idx_slack_channel_configs_integration
  ON slack_channel_configs(slack_integration_id);

CREATE INDEX IF NOT EXISTS idx_slack_channel_configs_agency
  ON slack_channel_configs(agency_id)
  WHERE agency_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_slack_channel_configs_notification_type
  ON slack_channel_configs(notification_type);

CREATE INDEX IF NOT EXISTS idx_slack_channel_configs_active
  ON slack_channel_configs(imo_id, notification_type)
  WHERE is_active = true;

-- slack_messages
CREATE INDEX IF NOT EXISTS idx_slack_messages_imo_id
  ON slack_messages(imo_id);

CREATE INDEX IF NOT EXISTS idx_slack_messages_status
  ON slack_messages(status)
  WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_slack_messages_created_at
  ON slack_messages(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_slack_messages_related_entity
  ON slack_messages(related_entity_type, related_entity_id)
  WHERE related_entity_id IS NOT NULL;

-- ============================================================================
-- Updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_slack_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_slack_integrations_updated_at ON slack_integrations;
CREATE TRIGGER trigger_slack_integrations_updated_at
  BEFORE UPDATE ON slack_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_integrations_updated_at();

CREATE OR REPLACE FUNCTION update_slack_channel_configs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_slack_channel_configs_updated_at ON slack_channel_configs;
CREATE TRIGGER trigger_slack_channel_configs_updated_at
  BEFORE UPDATE ON slack_channel_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_slack_channel_configs_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE slack_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_channel_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_messages ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user is IMO admin
CREATE OR REPLACE FUNCTION is_imo_admin_for(p_imo_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND imo_id = p_imo_id
    AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql;

-- slack_integrations: Only IMO admins can manage
CREATE POLICY "slack_integrations_select"
  ON slack_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND imo_id = slack_integrations.imo_id
    )
  );

CREATE POLICY "slack_integrations_insert"
  ON slack_integrations
  FOR INSERT
  WITH CHECK (is_imo_admin_for(imo_id));

CREATE POLICY "slack_integrations_update"
  ON slack_integrations
  FOR UPDATE
  USING (is_imo_admin_for(imo_id))
  WITH CHECK (is_imo_admin_for(imo_id));

CREATE POLICY "slack_integrations_delete"
  ON slack_integrations
  FOR DELETE
  USING (is_imo_admin_for(imo_id));

-- slack_channel_configs: IMO users can view, admins can manage
CREATE POLICY "slack_channel_configs_select"
  ON slack_channel_configs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND imo_id = slack_channel_configs.imo_id
    )
  );

CREATE POLICY "slack_channel_configs_insert"
  ON slack_channel_configs
  FOR INSERT
  WITH CHECK (is_imo_admin_for(imo_id));

CREATE POLICY "slack_channel_configs_update"
  ON slack_channel_configs
  FOR UPDATE
  USING (is_imo_admin_for(imo_id))
  WITH CHECK (is_imo_admin_for(imo_id));

CREATE POLICY "slack_channel_configs_delete"
  ON slack_channel_configs
  FOR DELETE
  USING (is_imo_admin_for(imo_id));

-- slack_messages: IMO users can view (audit trail)
CREATE POLICY "slack_messages_select"
  ON slack_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND imo_id = slack_messages.imo_id
    )
  );

-- Insert only via service role (Edge Functions)
CREATE POLICY "slack_messages_insert_service"
  ON slack_messages
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON slack_integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON slack_channel_configs TO authenticated;
GRANT SELECT, INSERT ON slack_messages TO authenticated;
GRANT USAGE ON TYPE slack_notification_type TO authenticated;
GRANT USAGE ON TYPE slack_connection_status TO authenticated;
GRANT USAGE ON TYPE slack_message_status TO authenticated;
