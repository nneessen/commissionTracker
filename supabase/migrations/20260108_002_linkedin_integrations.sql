-- supabase/migrations/20260108_002_linkedin_integrations.sql
-- LinkedIn DM Integration via Unipile - Integrations Table
-- Stores connections to LinkedIn accounts via Unipile unified messaging API

-- ============================================================================
-- Table: linkedin_integrations
-- Each user can connect their LinkedIn account via Unipile's hosted auth
-- Unipile manages OAuth tokens - we only store the account_id reference
-- ============================================================================

CREATE TABLE IF NOT EXISTS linkedin_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Unipile account reference (tokens managed by Unipile, not stored here)
  unipile_account_id TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'LINKEDIN',  -- LINKEDIN, LINKEDIN_RECRUITER, LINKEDIN_SALES_NAV

  -- LinkedIn profile info (fetched via Unipile API after connection)
  linkedin_profile_id TEXT,              -- LinkedIn member ID
  linkedin_username TEXT,                 -- LinkedIn vanity URL name (e.g., "johndoe")
  linkedin_display_name TEXT,             -- Full name
  linkedin_headline TEXT,                 -- Professional headline
  linkedin_profile_url TEXT,              -- Public profile URL
  linkedin_profile_picture_url TEXT,

  -- Connection status
  connection_status linkedin_connection_status NOT NULL DEFAULT 'connected',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_connected_at TIMESTAMPTZ DEFAULT now(),
  last_sync_at TIMESTAMPTZ,               -- Last successful conversation sync
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- API usage tracking (Unipile has rate limits per account)
  api_calls_this_hour INTEGER DEFAULT 0,
  api_calls_reset_at TIMESTAMPTZ DEFAULT now() + INTERVAL '1 hour',

  -- Billing tracking (~$5.50/account/month via Unipile)
  billing_started_at TIMESTAMPTZ DEFAULT now(),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  -- Each user can only connect one LinkedIn account per IMO
  CONSTRAINT linkedin_integrations_user_imo_unique UNIQUE(user_id, imo_id),
  -- Each Unipile account can only be connected once
  CONSTRAINT linkedin_integrations_unipile_unique UNIQUE(unipile_account_id)
);

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_linkedin_integrations_imo_id
  ON linkedin_integrations(imo_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_integrations_user_id
  ON linkedin_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_integrations_unipile_account
  ON linkedin_integrations(unipile_account_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_integrations_active
  ON linkedin_integrations(user_id)
  WHERE is_active = true AND connection_status = 'connected';

-- For sync CRON - find integrations needing sync
CREATE INDEX IF NOT EXISTS idx_linkedin_integrations_needs_sync
  ON linkedin_integrations(last_sync_at)
  WHERE is_active = true
    AND connection_status = 'connected';

-- ============================================================================
-- Updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_linkedin_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_linkedin_integrations_updated_at ON linkedin_integrations;
CREATE TRIGGER trigger_linkedin_integrations_updated_at
  BEFORE UPDATE ON linkedin_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_linkedin_integrations_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE linkedin_integrations ENABLE ROW LEVEL SECURITY;

-- Users can view integrations in their IMO (for team visibility)
CREATE POLICY "linkedin_integrations_select"
  ON linkedin_integrations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND imo_id = linkedin_integrations.imo_id
    )
  );

-- Users can only manage their own integration
CREATE POLICY "linkedin_integrations_insert"
  ON linkedin_integrations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "linkedin_integrations_update"
  ON linkedin_integrations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "linkedin_integrations_delete"
  ON linkedin_integrations
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON linkedin_integrations TO authenticated;
GRANT USAGE ON TYPE linkedin_connection_status TO authenticated;

COMMENT ON TABLE linkedin_integrations IS 'Stores LinkedIn account connections via Unipile unified messaging API';
COMMENT ON COLUMN linkedin_integrations.unipile_account_id IS 'Unipile account ID - tokens are managed by Unipile, not stored here';
COMMENT ON COLUMN linkedin_integrations.account_type IS 'Type of LinkedIn account: LINKEDIN, LINKEDIN_RECRUITER, or LINKEDIN_SALES_NAV';
COMMENT ON COLUMN linkedin_integrations.api_calls_this_hour IS 'Tracks API usage for rate limiting';
COMMENT ON COLUMN linkedin_integrations.billing_started_at IS 'When billing started (~$5.50/account/month via Unipile)';
