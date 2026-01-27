-- supabase/migrations/20260127091516_gmail_oauth_integration.sql
-- Gmail OAuth Integration - Database Schema
-- Enables users to connect their personal Gmail accounts for send/receive

-- ============================================================================
-- ENUM: gmail_connection_status
-- ============================================================================

CREATE TYPE gmail_connection_status AS ENUM (
  'connected',
  'disconnected',
  'expired',
  'error'
);

COMMENT ON TYPE gmail_connection_status IS 'Connection status for Gmail OAuth integrations';

-- ============================================================================
-- TABLE: gmail_integrations
-- Each user can connect their personal Gmail account
-- ============================================================================

CREATE TABLE IF NOT EXISTS gmail_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Gmail account info
  gmail_address TEXT NOT NULL,              -- user@gmail.com
  gmail_user_id TEXT NOT NULL,              -- Google user ID
  gmail_name TEXT,                          -- Display name from Google profile
  gmail_picture_url TEXT,                   -- Profile picture URL

  -- OAuth tokens (encrypted using AES-256-GCM)
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT NOT NULL,

  -- Token management
  -- Access tokens expire in 1 hour, refresh tokens are long-lived
  token_expires_at TIMESTAMPTZ NOT NULL,
  last_refresh_at TIMESTAMPTZ,

  -- Permissions granted during OAuth
  scopes TEXT[] NOT NULL DEFAULT '{}',

  -- Connection status
  connection_status gmail_connection_status NOT NULL DEFAULT 'connected',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_connected_at TIMESTAMPTZ DEFAULT now(),
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  -- Sync state for incremental inbox sync
  history_id TEXT,                          -- Gmail historyId for incremental sync
  last_synced_at TIMESTAMPTZ,
  last_full_sync_at TIMESTAMPTZ,            -- Track when we did full sync

  -- API usage tracking (Gmail has quotas)
  api_calls_today INTEGER DEFAULT 0,
  api_calls_reset_at TIMESTAMPTZ DEFAULT (CURRENT_DATE + INTERVAL '1 day'),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  -- Each user can only connect one Gmail account
  CONSTRAINT gmail_integrations_user_unique UNIQUE(user_id),
  -- Each Gmail account can only be connected once across the entire system
  CONSTRAINT gmail_integrations_gmail_unique UNIQUE(gmail_address)
);

-- ============================================================================
-- Indexes for gmail_integrations
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_gmail_integrations_user_id
  ON gmail_integrations(user_id);

CREATE INDEX IF NOT EXISTS idx_gmail_integrations_gmail_address
  ON gmail_integrations(gmail_address);

-- For finding active integrations quickly
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_active
  ON gmail_integrations(user_id)
  WHERE is_active = true AND connection_status = 'connected';

-- For token refresh CRON - find tokens expiring soon
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_token_expiry
  ON gmail_integrations(token_expires_at)
  WHERE is_active = true
    AND connection_status = 'connected';

-- For sync CRON - find integrations that need syncing
CREATE INDEX IF NOT EXISTS idx_gmail_integrations_sync
  ON gmail_integrations(last_synced_at)
  WHERE is_active = true
    AND connection_status = 'connected';

-- ============================================================================
-- TABLE: gmail_sync_log
-- Debugging and monitoring for Gmail sync operations
-- ============================================================================

CREATE TABLE IF NOT EXISTS gmail_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES gmail_integrations(id) ON DELETE CASCADE,

  sync_type TEXT NOT NULL,                  -- 'full', 'incremental', 'send'
  messages_synced INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  status TEXT NOT NULL,                     -- 'success', 'partial', 'failed'
  error_message TEXT,
  duration_ms INTEGER,

  -- Details for debugging
  history_id_before TEXT,
  history_id_after TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gmail_sync_log_integration
  ON gmail_sync_log(integration_id, created_at DESC);

-- ============================================================================
-- MODIFY: user_emails - Add Gmail columns for provider tracking
-- ============================================================================

DO $$
BEGIN
  -- Gmail message ID (unique ID from Gmail API)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'gmail_message_id') THEN
    ALTER TABLE user_emails ADD COLUMN gmail_message_id TEXT;
  END IF;

  -- Gmail thread ID (for thread matching)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'gmail_thread_id') THEN
    ALTER TABLE user_emails ADD COLUMN gmail_thread_id TEXT;
  END IF;

  -- Gmail label IDs (INBOX, SENT, STARRED, etc.)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'gmail_label_ids') THEN
    ALTER TABLE user_emails ADD COLUMN gmail_label_ids TEXT[];
  END IF;

  -- Gmail history ID (for this specific message)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'gmail_history_id') THEN
    ALTER TABLE user_emails ADD COLUMN gmail_history_id TEXT;
  END IF;

  -- Email provider (to know which system sent/received the email)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'email_provider') THEN
    ALTER TABLE user_emails ADD COLUMN email_provider TEXT DEFAULT 'mailgun';
  END IF;

  -- Is incoming (received vs sent)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'is_incoming') THEN
    ALTER TABLE user_emails ADD COLUMN is_incoming BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Unique index for Gmail message deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_emails_gmail_message_id_unique
  ON user_emails(gmail_message_id)
  WHERE gmail_message_id IS NOT NULL;

-- Index for finding emails by Gmail thread
CREATE INDEX IF NOT EXISTS idx_user_emails_gmail_thread_id
  ON user_emails(gmail_thread_id)
  WHERE gmail_thread_id IS NOT NULL;

-- Index for filtering by provider
CREATE INDEX IF NOT EXISTS idx_user_emails_provider
  ON user_emails(user_id, email_provider);

-- Index for incoming emails
CREATE INDEX IF NOT EXISTS idx_user_emails_incoming
  ON user_emails(user_id, is_incoming, created_at DESC)
  WHERE is_incoming = true;

-- ============================================================================
-- Updated_at trigger for gmail_integrations
-- ============================================================================

CREATE OR REPLACE FUNCTION update_gmail_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_gmail_integrations_updated_at ON gmail_integrations;
CREATE TRIGGER trigger_gmail_integrations_updated_at
  BEFORE UPDATE ON gmail_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_gmail_integrations_updated_at();

-- ============================================================================
-- RLS Policies for gmail_integrations
-- ============================================================================

ALTER TABLE gmail_integrations ENABLE ROW LEVEL SECURITY;

-- Users can only view their own integration
CREATE POLICY "gmail_integrations_select"
  ON gmail_integrations
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can only manage their own integration
CREATE POLICY "gmail_integrations_insert"
  ON gmail_integrations
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gmail_integrations_update"
  ON gmail_integrations
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "gmail_integrations_delete"
  ON gmail_integrations
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS Policies for gmail_sync_log
-- ============================================================================

ALTER TABLE gmail_sync_log ENABLE ROW LEVEL SECURITY;

-- Users can only view sync logs for their own integration
CREATE POLICY "gmail_sync_log_select"
  ON gmail_sync_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gmail_integrations
      WHERE gmail_integrations.id = gmail_sync_log.integration_id
      AND gmail_integrations.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON gmail_integrations TO authenticated;
GRANT SELECT ON gmail_sync_log TO authenticated;
GRANT USAGE ON TYPE gmail_connection_status TO authenticated;

-- Service role needs full access for edge functions
GRANT ALL ON gmail_integrations TO service_role;
GRANT ALL ON gmail_sync_log TO service_role;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE gmail_integrations IS 'Stores Gmail OAuth connections - one per user for send/receive email via Gmail API';
COMMENT ON COLUMN gmail_integrations.access_token_encrypted IS 'AES-256-GCM encrypted OAuth access token (1hr expiry)';
COMMENT ON COLUMN gmail_integrations.refresh_token_encrypted IS 'AES-256-GCM encrypted OAuth refresh token (long-lived)';
COMMENT ON COLUMN gmail_integrations.history_id IS 'Gmail historyId for incremental inbox sync';
COMMENT ON COLUMN gmail_integrations.api_calls_today IS 'Daily API call tracking for quota management';

COMMENT ON TABLE gmail_sync_log IS 'Audit log for Gmail sync operations - debugging and monitoring';

COMMENT ON COLUMN user_emails.gmail_message_id IS 'Gmail API message ID for deduplication';
COMMENT ON COLUMN user_emails.gmail_thread_id IS 'Gmail thread ID for conversation matching';
COMMENT ON COLUMN user_emails.gmail_label_ids IS 'Gmail labels: INBOX, SENT, STARRED, UNREAD, etc.';
COMMENT ON COLUMN user_emails.email_provider IS 'Which service sent/received: mailgun, gmail';
COMMENT ON COLUMN user_emails.is_incoming IS 'True for received emails, false for sent';
