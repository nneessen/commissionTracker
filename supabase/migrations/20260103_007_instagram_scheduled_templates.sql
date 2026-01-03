-- supabase/migrations/20260103_007_instagram_scheduled_templates.sql
-- Instagram DM Integration - Scheduled Messages and Templates

-- ============================================================================
-- Table: instagram_message_templates
-- Reusable message templates for quick responses and automation
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imo_id UUID NOT NULL REFERENCES imos(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL = org-wide template

  -- Template content
  name TEXT NOT NULL,
  content TEXT NOT NULL,                     -- Max 1000 chars for IG messages
  category TEXT,                             -- 'greeting', 'follow_up', 'scheduling', 'closing', etc.

  -- Usage tracking
  use_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  -- Constraints
  CONSTRAINT instagram_templates_name_unique UNIQUE(imo_id, user_id, name),
  CONSTRAINT instagram_templates_content_length CHECK (char_length(content) <= 1000)
);

-- ============================================================================
-- Table: instagram_scheduled_messages
-- Queue for scheduled and automated messages
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_scheduled_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,

  -- Message content
  message_text TEXT NOT NULL,
  template_id UUID REFERENCES instagram_message_templates(id) ON DELETE SET NULL,

  -- Scheduling
  scheduled_for TIMESTAMPTZ NOT NULL,        -- When to send
  scheduled_by UUID NOT NULL REFERENCES auth.users(id),

  -- Messaging window validation
  -- Must send before this time or message will expire
  messaging_window_expires_at TIMESTAMPTZ NOT NULL,

  -- Status tracking
  status scheduled_message_status NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  sent_message_id UUID REFERENCES instagram_messages(id),
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Automation context
  is_auto_reminder BOOLEAN DEFAULT false,    -- Was this created by auto-reminder system?

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT scheduled_msg_valid_window CHECK (scheduled_for <= messaging_window_expires_at),
  CONSTRAINT scheduled_msg_content_length CHECK (char_length(message_text) <= 1000)
);

-- ============================================================================
-- Table: instagram_usage_tracking
-- Tracks API and message usage for billing/quotas
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_usage_tracking (
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

  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Unique per user per period
  CONSTRAINT instagram_usage_unique UNIQUE(imo_id, user_id, period_start)
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- instagram_message_templates
CREATE INDEX IF NOT EXISTS idx_instagram_templates_imo
  ON instagram_message_templates(imo_id);

CREATE INDEX IF NOT EXISTS idx_instagram_templates_user
  ON instagram_message_templates(user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_instagram_templates_category
  ON instagram_message_templates(imo_id, category)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_instagram_templates_active
  ON instagram_message_templates(imo_id)
  WHERE is_active = true;

-- instagram_scheduled_messages
CREATE INDEX IF NOT EXISTS idx_instagram_scheduled_conversation
  ON instagram_scheduled_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_instagram_scheduled_pending
  ON instagram_scheduled_messages(scheduled_for)
  WHERE status = 'pending';

-- For CRON job: find messages due to be sent
CREATE INDEX IF NOT EXISTS idx_instagram_scheduled_due
  ON instagram_scheduled_messages(status, scheduled_for)
  WHERE status = 'pending';

-- For finding expired messages
CREATE INDEX IF NOT EXISTS idx_instagram_scheduled_expired
  ON instagram_scheduled_messages(messaging_window_expires_at)
  WHERE status = 'pending';

-- instagram_usage_tracking
CREATE INDEX IF NOT EXISTS idx_instagram_usage_imo
  ON instagram_usage_tracking(imo_id, period_start);

CREATE INDEX IF NOT EXISTS idx_instagram_usage_user
  ON instagram_usage_tracking(user_id, period_start);

-- ============================================================================
-- Updated_at triggers
-- ============================================================================

CREATE OR REPLACE FUNCTION update_instagram_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_instagram_templates_updated_at ON instagram_message_templates;
CREATE TRIGGER trigger_instagram_templates_updated_at
  BEFORE UPDATE ON instagram_message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_instagram_templates_updated_at();

CREATE OR REPLACE FUNCTION update_instagram_scheduled_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_instagram_scheduled_updated_at ON instagram_scheduled_messages;
CREATE TRIGGER trigger_instagram_scheduled_updated_at
  BEFORE UPDATE ON instagram_scheduled_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_instagram_scheduled_updated_at();

-- ============================================================================
-- Function: Expire scheduled messages past window
-- Called by CRON job
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_instagram_scheduled_messages()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE instagram_scheduled_messages
  SET
    status = 'expired',
    error_message = 'Messaging window expired before scheduled send time',
    updated_at = now()
  WHERE status = 'pending'
    AND messaging_window_expires_at < now();

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Function: Increment template usage
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_template_usage(p_template_id UUID)
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE instagram_message_templates
  SET
    use_count = use_count + 1,
    last_used_at = now()
  WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE instagram_message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_scheduled_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_usage_tracking ENABLE ROW LEVEL SECURITY;

-- Templates: IMO users can view all templates, manage their own or org-wide if admin
CREATE POLICY "instagram_templates_select"
  ON instagram_message_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND imo_id = instagram_message_templates.imo_id
    )
  );

CREATE POLICY "instagram_templates_insert"
  ON instagram_message_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND imo_id = instagram_message_templates.imo_id
    )
    AND (user_id IS NULL OR user_id = auth.uid())
  );

CREATE POLICY "instagram_templates_update"
  ON instagram_message_templates
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND is_imo_admin_for(imo_id))
  );

CREATE POLICY "instagram_templates_delete"
  ON instagram_message_templates
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR (user_id IS NULL AND is_imo_admin_for(imo_id))
  );

-- Scheduled messages: User can only manage scheduled messages for their conversations
CREATE POLICY "instagram_scheduled_select"
  ON instagram_scheduled_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instagram_conversations c
      JOIN instagram_integrations i ON i.id = c.integration_id
      WHERE c.id = instagram_scheduled_messages.conversation_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "instagram_scheduled_insert"
  ON instagram_scheduled_messages
  FOR INSERT
  WITH CHECK (
    scheduled_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM instagram_conversations c
      JOIN instagram_integrations i ON i.id = c.integration_id
      WHERE c.id = instagram_scheduled_messages.conversation_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "instagram_scheduled_update"
  ON instagram_scheduled_messages
  FOR UPDATE
  USING (scheduled_by = auth.uid());

CREATE POLICY "instagram_scheduled_delete"
  ON instagram_scheduled_messages
  FOR DELETE
  USING (scheduled_by = auth.uid() AND status = 'pending');

-- Usage tracking: Users can view their own usage
CREATE POLICY "instagram_usage_select"
  ON instagram_usage_tracking
  FOR SELECT
  USING (user_id = auth.uid());

-- Insert/update via service role only

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON instagram_message_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON instagram_scheduled_messages TO authenticated;
GRANT SELECT ON instagram_usage_tracking TO authenticated;
GRANT USAGE ON TYPE scheduled_message_status TO authenticated;
GRANT EXECUTE ON FUNCTION expire_instagram_scheduled_messages TO authenticated;
GRANT EXECUTE ON FUNCTION increment_template_usage TO authenticated;

COMMENT ON TABLE instagram_message_templates IS 'Reusable message templates for Instagram DMs';
COMMENT ON TABLE instagram_scheduled_messages IS 'Queue for scheduled and automated Instagram messages';
COMMENT ON TABLE instagram_usage_tracking IS 'Monthly usage tracking for Instagram messaging feature';
COMMENT ON COLUMN instagram_scheduled_messages.messaging_window_expires_at IS 'Message will be marked as expired if window closes before send time';
