-- supabase/migrations/20260108_004_linkedin_scheduled.sql
-- LinkedIn DM Integration via Unipile - Scheduled Messages and Usage Tracking

-- ============================================================================
-- Table: linkedin_scheduled_messages
-- Queue for scheduled and automated messages
-- Note: LinkedIn doesn't have Instagram's 24-hour window limitation
-- ============================================================================

CREATE TABLE IF NOT EXISTS linkedin_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES linkedin_conversations(id) ON DELETE CASCADE,

  -- Message content (LinkedIn allows up to ~8000 chars)
  message_text TEXT NOT NULL,
  template_id UUID,                            -- FK to message_templates

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,          -- When to send
  scheduled_by UUID NOT NULL REFERENCES auth.users(id),

  -- Optional validity window (for time-sensitive messages)
  valid_until TIMESTAMPTZ,                     -- Optional expiry for scheduled messages

  -- Status tracking
  status scheduled_message_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  sent_message_id UUID REFERENCES linkedin_messages(id),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Automation context
  is_auto_reminder BOOLEAN DEFAULT false,      -- Was this created by auto-reminder system?

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT linkedin_scheduled_msg_content_length CHECK (char_length(message_text) <= 8000),
  CONSTRAINT linkedin_scheduled_msg_valid_window CHECK (
    valid_until IS NULL OR scheduled_for <= valid_until
  )
);

-- ============================================================================
-- Table: linkedin_usage_tracking
-- Tracks API and message usage for billing/quotas
-- ============================================================================

CREATE TABLE IF NOT EXISTS linkedin_usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Usage period (monthly)
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Counters
  messages_sent INTEGER DEFAULT 0,
  messages_received INTEGER DEFAULT 0,
  api_calls_made INTEGER DEFAULT 0,
  scheduled_messages_sent INTEGER DEFAULT 0,
  templates_used INTEGER DEFAULT 0,
  inmails_sent INTEGER DEFAULT 0,              -- LinkedIn-specific: InMails used
  connection_requests_sent INTEGER DEFAULT 0,  -- LinkedIn-specific

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique per user per period
  CONSTRAINT linkedin_usage_unique UNIQUE(imo_id, user_id, period_start)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- linkedin_scheduled_messages
CREATE INDEX IF NOT EXISTS idx_linkedin_scheduled_conversation
  ON linkedin_scheduled_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_scheduled_pending
  ON linkedin_scheduled_messages(scheduled_for)
  WHERE status = 'pending';

-- For CRON job: find messages due to be sent
CREATE INDEX IF NOT EXISTS idx_linkedin_scheduled_due
  ON linkedin_scheduled_messages(status, scheduled_for)
  WHERE status = 'pending';

-- For finding expired messages (if valid_until is set)
CREATE INDEX IF NOT EXISTS idx_linkedin_scheduled_expired
  ON linkedin_scheduled_messages(valid_until)
  WHERE status = 'pending' AND valid_until IS NOT NULL;

-- linkedin_usage_tracking
CREATE INDEX IF NOT EXISTS idx_linkedin_usage_imo
  ON linkedin_usage_tracking(imo_id, period_start);

CREATE INDEX IF NOT EXISTS idx_linkedin_usage_user
  ON linkedin_usage_tracking(user_id, period_start);

-- ============================================================================
-- Updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_linkedin_scheduled_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_linkedin_scheduled_updated_at ON linkedin_scheduled_messages;
CREATE TRIGGER trigger_linkedin_scheduled_updated_at
  BEFORE UPDATE ON linkedin_scheduled_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_linkedin_scheduled_updated_at();

-- ============================================================================
-- Function: Expire scheduled messages past valid_until
-- Called by CRON job
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_linkedin_scheduled_messages()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE linkedin_scheduled_messages
  SET
    status = 'expired',
    error_message = 'Message validity window expired before scheduled send time',
    updated_at = now()
  WHERE status = 'pending'
    AND valid_until IS NOT NULL
    AND valid_until < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE linkedin_scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Scheduled messages: User can only manage scheduled messages for their conversations
CREATE POLICY "linkedin_scheduled_select"
  ON linkedin_scheduled_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM linkedin_conversations c
      JOIN linkedin_integrations i ON i.id = c.integration_id
      WHERE c.id = linkedin_scheduled_messages.conversation_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "linkedin_scheduled_insert"
  ON linkedin_scheduled_messages
  FOR INSERT
  WITH CHECK (
    scheduled_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM linkedin_conversations c
      JOIN linkedin_integrations i ON i.id = c.integration_id
      WHERE c.id = linkedin_scheduled_messages.conversation_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "linkedin_scheduled_update"
  ON linkedin_scheduled_messages
  FOR UPDATE
  USING (scheduled_by = auth.uid());

CREATE POLICY "linkedin_scheduled_delete"
  ON linkedin_scheduled_messages
  FOR DELETE
  USING (scheduled_by = auth.uid() AND status = 'pending');

-- Usage tracking: Users can view their own usage
CREATE POLICY "linkedin_usage_select"
  ON linkedin_usage_tracking
  FOR SELECT
  USING (user_id = auth.uid());

-- Insert/update via service role only

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON linkedin_scheduled_messages TO authenticated;
GRANT SELECT ON linkedin_usage_tracking TO authenticated;
GRANT EXECUTE ON FUNCTION expire_linkedin_scheduled_messages TO authenticated;

COMMENT ON TABLE linkedin_scheduled_messages IS 'Queue for scheduled and automated LinkedIn messages';
COMMENT ON TABLE linkedin_usage_tracking IS 'Monthly usage tracking for LinkedIn messaging feature';
COMMENT ON COLUMN linkedin_scheduled_messages.valid_until IS 'Optional - message will be marked as expired if not sent by this time';
COMMENT ON COLUMN linkedin_usage_tracking.inmails_sent IS 'LinkedIn InMails used (premium feature)';
