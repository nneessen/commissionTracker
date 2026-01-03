-- supabase/migrations/20260103_005_instagram_integrations.sql
-- Instagram DM Integration - Integrations Table
-- Stores OAuth connections for Instagram Business/Creator accounts

-- ============================================================================
-- Table: instagram_integrations
-- Each user can connect their own Instagram Business/Creator account
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Instagram account info
  instagram_user_id TEXT NOT NULL,          -- IG user ID (e.g., "17841400000000000")
  instagram_username TEXT NOT NULL,          -- @handle without @
  instagram_name TEXT,                       -- Display name
  instagram_profile_picture_url TEXT,        -- Profile photo URL

  -- Connected Facebook Page (required for IG Business API)
  facebook_page_id TEXT NOT NULL,
  facebook_page_name TEXT,

  -- OAuth tokens (encrypted using AES-256-GCM, same as Slack)
  access_token_encrypted TEXT NOT NULL,

  -- Token management
  -- Long-lived tokens last ~60 days, should refresh at day 53
  token_expires_at TIMESTAMPTZ,
  last_refresh_at TIMESTAMPTZ,

  -- Permissions granted during OAuth
  scopes TEXT[] NOT NULL DEFAULT '{}',

  -- Connection status
  connection_status instagram_connection_status NOT NULL DEFAULT 'connected',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_connected_at TIMESTAMPTZ DEFAULT now(),
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- API usage tracking (Instagram has 200 calls/user/hour limit)
  api_calls_this_hour INTEGER DEFAULT 0,
  api_calls_reset_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  -- Each user can only connect one IG account per IMO
  CONSTRAINT instagram_integrations_user_imo_unique UNIQUE(user_id, imo_id),
  -- Each IG account can only be connected once across the entire system
  CONSTRAINT instagram_integrations_ig_user_unique UNIQUE(instagram_user_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_instagram_integrations_imo_id
  ON instagram_integrations(imo_id);

CREATE INDEX IF NOT EXISTS idx_instagram_integrations_user_id
  ON instagram_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_instagram_integrations_ig_user_id
  ON instagram_integrations(instagram_user_id);

CREATE INDEX IF NOT EXISTS idx_instagram_integrations_active
  ON instagram_integrations(user_id)
  WHERE is_active = true AND connection_status = 'connected';

-- For token refresh CRON - find tokens expiring soon
CREATE INDEX IF NOT EXISTS idx_instagram_integrations_token_expiry
  ON instagram_integrations(token_expires_at)
  WHERE is_active = true
    AND connection_status = 'connected'
    AND token_expires_at IS NOT NULL;

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_instagram_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_instagram_integrations_updated_at ON instagram_integrations;
CREATE TRIGGER trigger_instagram_integrations_updated_at
  BEFORE UPDATE ON instagram_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_instagram_integrations_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE instagram_integrations ENABLE ROW LEVEL SECURITY;

-- Users can view integrations in their IMO (for team visibility)
CREATE POLICY "instagram_integrations_select"
  ON instagram_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND imo_id = instagram_integrations.imo_id
    )
  );

-- Users can only manage their own integration
CREATE POLICY "instagram_integrations_insert"
  ON instagram_integrations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "instagram_integrations_update"
  ON instagram_integrations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "instagram_integrations_delete"
  ON instagram_integrations
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON instagram_integrations TO authenticated;
GRANT USAGE ON TYPE instagram_connection_status TO authenticated;

COMMENT ON TABLE instagram_integrations IS 'Stores Instagram Business/Creator account OAuth connections per user';
COMMENT ON COLUMN instagram_integrations.facebook_page_id IS 'Required - IG Business accounts must be connected to a Facebook Page';
COMMENT ON COLUMN instagram_integrations.token_expires_at IS 'Long-lived tokens expire in ~60 days, refresh at day 53';
COMMENT ON COLUMN instagram_integrations.api_calls_this_hour IS 'Tracks API usage (200 calls/user/hour limit)';
