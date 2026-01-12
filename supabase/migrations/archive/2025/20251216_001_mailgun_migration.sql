-- Migration: 20251216_001_mailgun_migration.sql
-- Purpose: Add indexes and columns for Mailgun email integration with proper threading

-- ============================================================================
-- INDEXES FOR THREADING PERFORMANCE
-- ============================================================================

-- Index for Message-ID header lookups (critical for threading inbound replies)
CREATE INDEX IF NOT EXISTS idx_user_emails_message_id_header
  ON user_emails(message_id_header)
  WHERE message_id_header IS NOT NULL;

-- Index for In-Reply-To header lookups (finding parent messages)
CREATE INDEX IF NOT EXISTS idx_user_emails_in_reply_to_header
  ON user_emails(in_reply_to_header)
  WHERE in_reply_to_header IS NOT NULL;

-- Index for subject_hash lookups on threads (fallback threading)
CREATE INDEX IF NOT EXISTS idx_email_threads_subject_hash
  ON email_threads(subject_hash);

-- Index for faster sent folder queries (sender_id + is_incoming)
CREATE INDEX IF NOT EXISTS idx_user_emails_sender_outgoing
  ON user_emails(sender_id, is_incoming)
  WHERE is_incoming = false;

-- Index for faster inbox queries (user_id + is_incoming)
CREATE INDEX IF NOT EXISTS idx_user_emails_user_incoming
  ON user_emails(user_id, is_incoming)
  WHERE is_incoming = true;

-- ============================================================================
-- OPTIONAL: MAILBOX SETTINGS TABLE FOR FUTURE ENHANCEMENTS
-- ============================================================================

-- Per-user mailbox settings (for future features like auto-reply, custom addresses)
CREATE TABLE IF NOT EXISTS user_mailbox_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  display_name TEXT,
  auto_reply_enabled BOOLEAN DEFAULT false,
  auto_reply_message TEXT,
  auto_reply_subject TEXT,
  notification_email_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_mailbox_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_mailbox_settings
CREATE POLICY "Users can view own mailbox settings"
  ON user_mailbox_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mailbox settings"
  ON user_mailbox_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mailbox settings"
  ON user_mailbox_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own mailbox settings"
  ON user_mailbox_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- WEBHOOK EVENTS TABLE FOR IDEMPOTENT PROCESSING
-- ============================================================================

-- Store processed webhook events to prevent duplicate processing
CREATE TABLE IF NOT EXISTS email_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL, -- 'mailgun' or 'resend'
  event_id TEXT NOT NULL, -- Provider's unique event identifier
  event_type TEXT NOT NULL, -- 'delivered', 'opened', 'clicked', 'bounced', 'failed', etc.
  email_id UUID REFERENCES user_emails(id) ON DELETE SET NULL,
  message_id TEXT, -- Provider's message ID
  payload JSONB, -- Raw webhook payload for debugging
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique constraint to prevent duplicate event processing
  UNIQUE(provider, event_id)
);

-- Index for looking up events by email
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_email_id
  ON email_webhook_events(email_id);

-- Index for looking up events by provider message ID
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_message_id
  ON email_webhook_events(message_id);

-- Enable RLS (webhook events are system-level, accessed by service role)
ALTER TABLE email_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access webhook events (no user access)
-- Note: Edge functions use service role key, so no explicit policy needed
-- for reads/writes from webhooks

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN user_emails.message_id_header IS 'RFC 5322 Message-ID header for threading';
COMMENT ON COLUMN user_emails.in_reply_to_header IS 'RFC 5322 In-Reply-To header for threading';
COMMENT ON COLUMN user_emails.references_header IS 'RFC 5322 References header chain for threading';
COMMENT ON COLUMN user_emails.provider IS 'Email provider used: mailgun, resend, gmail_api';
COMMENT ON COLUMN user_emails.provider_message_id IS 'Provider-specific message identifier';

COMMENT ON TABLE email_webhook_events IS 'Idempotent storage of processed webhook events';
COMMENT ON TABLE user_mailbox_settings IS 'Per-user mailbox configuration and preferences';
