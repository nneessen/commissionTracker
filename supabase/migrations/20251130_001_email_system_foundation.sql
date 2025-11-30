-- Email System Foundation Migration
-- Creates tables for OAuth tokens, templates, triggers, queue, and quota tracking
-- Also extends existing user_emails table for Gmail/Outlook integration

-- ============================================================================
-- 1. USER_EMAIL_OAUTH_TOKENS - Encrypted OAuth token storage
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_email_oauth_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'gmail' | 'outlook'
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_expiry TIMESTAMPTZ,
  scopes TEXT[],
  email_address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Indexes for OAuth tokens
CREATE INDEX IF NOT EXISTS idx_email_oauth_user_provider ON user_email_oauth_tokens(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_email_oauth_active ON user_email_oauth_tokens(is_active) WHERE is_active = true;

-- RLS for OAuth tokens (only the user can see their own tokens)
ALTER TABLE user_email_oauth_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_email_oauth_tokens' AND policyname = 'Users can view own OAuth tokens') THEN
    CREATE POLICY "Users can view own OAuth tokens" ON user_email_oauth_tokens
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = user_email_oauth_tokens.user_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_email_oauth_tokens' AND policyname = 'Users can insert own OAuth tokens') THEN
    CREATE POLICY "Users can insert own OAuth tokens" ON user_email_oauth_tokens
      FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = user_email_oauth_tokens.user_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_email_oauth_tokens' AND policyname = 'Users can update own OAuth tokens') THEN
    CREATE POLICY "Users can update own OAuth tokens" ON user_email_oauth_tokens
      FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = user_email_oauth_tokens.user_id));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_email_oauth_tokens' AND policyname = 'Users can delete own OAuth tokens') THEN
    CREATE POLICY "Users can delete own OAuth tokens" ON user_email_oauth_tokens
      FOR DELETE USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = user_email_oauth_tokens.user_id));
  END IF;
END $$;

-- ============================================================================
-- 2. EMAIL_TEMPLATES - Reusable email templates with variable support
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general', -- 'onboarding', 'documents', 'follow_up', 'general'
  is_global BOOLEAN DEFAULT false,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for templates
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_active ON email_templates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_templates_created_by ON email_templates(created_by);

-- RLS for email templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Anyone can view global templates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Anyone can view global templates') THEN
    CREATE POLICY "Anyone can view global templates" ON email_templates
      FOR SELECT USING (is_global = true);
  END IF;

  -- Users can view their own templates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Users can view own templates') THEN
    CREATE POLICY "Users can view own templates" ON email_templates
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = email_templates.created_by));
  END IF;

  -- Only admin/trainer/contract_admin can create global templates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Admins can manage templates') THEN
    CREATE POLICY "Admins can manage templates" ON email_templates
      FOR ALL USING (
        auth.uid() IN (
          SELECT user_id FROM user_profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'trainer', 'contracting_manager')
        )
      );
  END IF;

  -- Users can insert their own templates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Users can insert own templates') THEN
    CREATE POLICY "Users can insert own templates" ON email_templates
      FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = email_templates.created_by)
        AND is_global = false
      );
  END IF;

  -- Users can update their own non-global templates
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_templates' AND policyname = 'Users can update own templates') THEN
    CREATE POLICY "Users can update own templates" ON email_templates
      FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = email_templates.created_by)
        AND is_global = false
      );
  END IF;
END $$;

-- ============================================================================
-- 3. EMAIL_TRIGGERS - Automatic email trigger rules
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL, -- 'phase_started', 'phase_completed', 'phase_blocked', 'checklist_completed', 'checklist_approved', 'checklist_rejected', 'recruit_graduated'
  trigger_config JSONB NOT NULL,
  template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
  delay_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for triggers
CREATE INDEX IF NOT EXISTS idx_email_triggers_type ON email_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_email_triggers_active ON email_triggers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_triggers_template ON email_triggers(template_id);

-- RLS for email triggers (admin only)
ALTER TABLE email_triggers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_triggers' AND policyname = 'Admins can manage triggers') THEN
    CREATE POLICY "Admins can manage triggers" ON email_triggers
      FOR ALL USING (
        auth.uid() IN (
          SELECT user_id FROM user_profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'trainer', 'contracting_manager')
        )
      );
  END IF;

  -- All authenticated users can view active triggers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_triggers' AND policyname = 'Authenticated users can view active triggers') THEN
    CREATE POLICY "Authenticated users can view active triggers" ON email_triggers
      FOR SELECT USING (is_active = true);
  END IF;
END $$;

-- ============================================================================
-- 4. EMAIL_QUEUE - Queue for scheduled/triggered emails
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_id UUID REFERENCES email_triggers(id) ON DELETE SET NULL,
  recipient_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  template_id UUID REFERENCES email_templates(id) ON DELETE SET NULL,
  subject TEXT,
  body_html TEXT,
  variables JSONB,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'sent', 'failed', 'cancelled'
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  email_id UUID REFERENCES user_emails(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_recipient ON email_queue(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_queue_sender ON email_queue(sender_user_id);

-- RLS for email queue
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Users can view their own queue items (as sender)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_queue' AND policyname = 'Users can view own queue items') THEN
    CREATE POLICY "Users can view own queue items" ON email_queue
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = email_queue.sender_user_id));
  END IF;

  -- Admins can view all queue items
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_queue' AND policyname = 'Admins can view all queue items') THEN
    CREATE POLICY "Admins can view all queue items" ON email_queue
      FOR SELECT USING (
        auth.uid() IN (
          SELECT user_id FROM user_profiles
          WHERE id = auth.uid()
          AND role IN ('admin')
        )
      );
  END IF;
END $$;

-- ============================================================================
-- 5. EMAIL_QUOTA_TRACKING - Rate limit tracking per provider
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_quota_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  emails_sent INTEGER DEFAULT 0,
  UNIQUE(user_id, provider, date)
);

-- Indexes for quota
CREATE INDEX IF NOT EXISTS idx_email_quota_user_date ON email_quota_tracking(user_id, date);

-- RLS for quota tracking
ALTER TABLE email_quota_tracking ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_quota_tracking' AND policyname = 'Users can view own quota') THEN
    CREATE POLICY "Users can view own quota" ON email_quota_tracking
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = email_quota_tracking.user_id));
  END IF;
END $$;

-- ============================================================================
-- 6. EMAIL_WATCH_SUBSCRIPTIONS - Gmail/Outlook watch subscription tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_watch_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  history_id TEXT,
  expiration TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, provider)
);

-- Index for watch subscriptions
CREATE INDEX IF NOT EXISTS idx_email_watch_expiration ON email_watch_subscriptions(expiration);

-- RLS for watch subscriptions
ALTER TABLE email_watch_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_watch_subscriptions' AND policyname = 'Users can view own watch subscriptions') THEN
    CREATE POLICY "Users can view own watch subscriptions" ON email_watch_subscriptions
      FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_profiles WHERE id = email_watch_subscriptions.user_id));
  END IF;
END $$;

-- ============================================================================
-- 7. EXTEND USER_EMAILS TABLE - Add Gmail/Outlook integration fields
-- ============================================================================
DO $$
BEGIN
  -- Add provider field
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'provider') THEN
    ALTER TABLE user_emails ADD COLUMN provider TEXT;
  END IF;

  -- Add provider_message_id for Gmail/Outlook message ID
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'provider_message_id') THEN
    ALTER TABLE user_emails ADD COLUMN provider_message_id TEXT;
  END IF;

  -- Add thread_id for email threading
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'thread_id') THEN
    ALTER TABLE user_emails ADD COLUMN thread_id TEXT;
  END IF;

  -- Add is_incoming flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'is_incoming') THEN
    ALTER TABLE user_emails ADD COLUMN is_incoming BOOLEAN DEFAULT false;
  END IF;

  -- Add reply_to_id for threading
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'reply_to_id') THEN
    ALTER TABLE user_emails ADD COLUMN reply_to_id UUID REFERENCES user_emails(id) ON DELETE SET NULL;
  END IF;

  -- Add from_address
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'from_address') THEN
    ALTER TABLE user_emails ADD COLUMN from_address TEXT;
  END IF;

  -- Add to_addresses array
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'to_addresses') THEN
    ALTER TABLE user_emails ADD COLUMN to_addresses TEXT[];
  END IF;

  -- Add cc_addresses array
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'cc_addresses') THEN
    ALTER TABLE user_emails ADD COLUMN cc_addresses TEXT[];
  END IF;

  -- Add labels array (Gmail labels)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_emails' AND column_name = 'labels') THEN
    ALTER TABLE user_emails ADD COLUMN labels TEXT[];
  END IF;
END $$;

-- Create additional indexes on user_emails
CREATE INDEX IF NOT EXISTS idx_user_emails_thread ON user_emails(thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_emails_incoming ON user_emails(user_id, is_incoming);
CREATE INDEX IF NOT EXISTS idx_user_emails_provider ON user_emails(provider) WHERE provider IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_emails_provider_message ON user_emails(provider_message_id) WHERE provider_message_id IS NOT NULL;

-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to increment email quota
CREATE OR REPLACE FUNCTION increment_email_quota(p_user_id UUID, p_provider TEXT)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO email_quota_tracking (user_id, provider, date, emails_sent)
  VALUES (p_user_id, p_provider, CURRENT_DATE, 1)
  ON CONFLICT (user_id, provider, date)
  DO UPDATE SET emails_sent = email_quota_tracking.emails_sent + 1
  RETURNING emails_sent INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check email quota
CREATE OR REPLACE FUNCTION check_email_quota(p_user_id UUID, p_provider TEXT, p_limit INTEGER DEFAULT 500)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COALESCE(emails_sent, 0) INTO v_count
  FROM email_quota_tracking
  WHERE user_id = p_user_id AND provider = p_provider AND date = CURRENT_DATE;

  RETURN COALESCE(v_count, 0) < p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_email_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_email_oauth_updated_at') THEN
    CREATE TRIGGER trigger_email_oauth_updated_at
      BEFORE UPDATE ON user_email_oauth_tokens
      FOR EACH ROW EXECUTE FUNCTION update_email_tables_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_email_templates_updated_at') THEN
    CREATE TRIGGER trigger_email_templates_updated_at
      BEFORE UPDATE ON email_templates
      FOR EACH ROW EXECUTE FUNCTION update_email_tables_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_email_triggers_updated_at') THEN
    CREATE TRIGGER trigger_email_triggers_updated_at
      BEFORE UPDATE ON email_triggers
      FOR EACH ROW EXECUTE FUNCTION update_email_tables_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_email_queue_updated_at') THEN
    CREATE TRIGGER trigger_email_queue_updated_at
      BEFORE UPDATE ON email_queue
      FOR EACH ROW EXECUTE FUNCTION update_email_tables_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_email_watch_updated_at') THEN
    CREATE TRIGGER trigger_email_watch_updated_at
      BEFORE UPDATE ON email_watch_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_email_tables_updated_at();
  END IF;
END $$;

-- ============================================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE user_email_oauth_tokens IS 'Stores encrypted OAuth tokens for Gmail/Outlook email integration';
COMMENT ON TABLE email_templates IS 'Reusable email templates with variable substitution support';
COMMENT ON TABLE email_triggers IS 'Automatic email trigger rules based on recruiting events';
COMMENT ON TABLE email_queue IS 'Queue for scheduled and triggered emails';
COMMENT ON TABLE email_quota_tracking IS 'Daily email send quota tracking per provider';
COMMENT ON TABLE email_watch_subscriptions IS 'Gmail/Outlook watch subscription tracking for incoming emails';

COMMENT ON COLUMN user_email_oauth_tokens.access_token_encrypted IS 'AES-256-GCM encrypted access token';
COMMENT ON COLUMN user_email_oauth_tokens.refresh_token_encrypted IS 'AES-256-GCM encrypted refresh token';
COMMENT ON COLUMN email_templates.variables IS 'Array of variable names used in template, e.g. {recruit_name, phase_name}';
COMMENT ON COLUMN email_triggers.trigger_config IS 'JSON config for trigger, e.g. {"phase_id": "uuid", "to_status": "completed"}';
COMMENT ON COLUMN email_queue.scheduled_for IS 'When the email should be sent (supports delayed sending)';
COMMENT ON COLUMN user_emails.thread_id IS 'Gmail/Outlook thread ID for conversation tracking';
COMMENT ON COLUMN user_emails.is_incoming IS 'True if email was received (not sent by user)';
