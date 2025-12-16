-- Migration: 20251216_005_messages_hub_tracking.sql
-- Purpose: Create tracking, scheduling, bulk send, and notification tables
-- Tables: email_tracking_events, email_tracking_links, email_scheduled,
--         bulk_email_campaigns, bulk_email_recipients, notification_preferences

-- ============================================================================
-- TABLE: email_tracking_events
-- Purpose: Record all open/click events for analytics
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_tracking_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES user_emails(id) ON DELETE CASCADE,
  tracking_id uuid NOT NULL, -- From user_emails.tracking_id
  event_type text NOT NULL, -- 'open', 'click'
  link_url text, -- Only for click events
  link_index integer, -- Which link (1st, 2nd, etc.)
  ip_address inet,
  user_agent text,
  device_type text, -- Parsed: desktop, mobile, tablet
  country text, -- GeoIP lookup
  city text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_events_email ON email_tracking_events(email_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_tracking ON email_tracking_events(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_created ON email_tracking_events(created_at);
CREATE INDEX IF NOT EXISTS idx_email_tracking_events_type ON email_tracking_events(event_type, created_at);

-- ============================================================================
-- TABLE: email_tracking_links
-- Purpose: Store original URLs for click tracking redirects
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_tracking_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id uuid NOT NULL REFERENCES user_emails(id) ON DELETE CASCADE,
  tracking_id uuid NOT NULL, -- Unique per link for redirect lookup
  original_url text NOT NULL,
  link_text text, -- The anchor text
  link_index integer NOT NULL, -- Position in email (1, 2, 3...)
  click_count integer DEFAULT 0,
  first_clicked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_links_tracking ON email_tracking_links(tracking_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_links_email ON email_tracking_links(email_id);

-- ============================================================================
-- TABLE: email_scheduled
-- Purpose: Queue for scheduled emails
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_scheduled (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_id uuid REFERENCES user_emails(id) ON DELETE CASCADE, -- Draft email
  scheduled_for timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'UTC',
  status text NOT NULL DEFAULT 'pending', -- pending, processing, sent, failed, cancelled
  retry_count integer DEFAULT 0,
  max_retries integer DEFAULT 3,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_scheduled_pending
  ON email_scheduled(scheduled_for)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_scheduled_user ON email_scheduled(user_id, status);

-- ============================================================================
-- TABLE: bulk_email_campaigns
-- Purpose: Track bulk email send campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  subject_override text, -- Optional override of template subject
  recipient_source text NOT NULL, -- 'manual', 'clients', 'label', 'segment'
  recipient_filter jsonb, -- Filter criteria if source is clients/segment
  recipient_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  delivered_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  clicked_count integer NOT NULL DEFAULT 0,
  bounced_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  unsubscribed_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, paused, completed, cancelled
  scheduled_for timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  send_rate integer DEFAULT 50, -- Emails per minute
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_user ON bulk_email_campaigns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_scheduled
  ON bulk_email_campaigns(scheduled_for)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_bulk_campaigns_sending
  ON bulk_email_campaigns(id)
  WHERE status = 'sending';

-- ============================================================================
-- TABLE: bulk_email_recipients
-- Purpose: Individual recipients in a bulk campaign
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES bulk_email_campaigns(id) ON DELETE CASCADE,
  contact_id uuid, -- Reference to client or user_profile
  contact_type text, -- 'client', 'agent', 'recruit', 'manual'
  email_address text NOT NULL,
  first_name text,
  last_name text,
  variables jsonb DEFAULT '{}', -- Custom merge variables
  status text NOT NULL DEFAULT 'pending', -- pending, sent, delivered, opened, clicked, bounced, failed, unsubscribed
  email_id uuid REFERENCES user_emails(id) ON DELETE SET NULL, -- Created when sent
  sent_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_recipients_campaign ON bulk_email_recipients(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_bulk_recipients_pending
  ON bulk_email_recipients(campaign_id)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bulk_recipients_email ON bulk_email_recipients(email_address);

-- ============================================================================
-- TABLE: notification_preferences
-- Purpose: Per-user notification settings for Messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  in_app_enabled boolean DEFAULT true,
  browser_push_enabled boolean DEFAULT false,
  browser_push_subscription jsonb, -- Web Push subscription object
  email_digest_enabled boolean DEFAULT false,
  email_digest_frequency text DEFAULT 'daily', -- daily, weekly
  email_digest_time time DEFAULT '09:00:00', -- When to send digest
  email_digest_timezone text DEFAULT 'America/New_York',
  quiet_hours_enabled boolean DEFAULT false,
  quiet_hours_start time DEFAULT '22:00:00',
  quiet_hours_end time DEFAULT '08:00:00',
  notify_on_reply boolean DEFAULT true,
  notify_on_open boolean DEFAULT false, -- Notify when email is opened
  notify_on_click boolean DEFAULT false, -- Notify when link is clicked
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- ============================================================================
-- TABLE: communication_preferences (per contact)
-- Purpose: Track email preferences per client/contact
-- ============================================================================
CREATE TABLE IF NOT EXISTS communication_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL, -- client or user_profile ID
  contact_type text NOT NULL, -- 'client', 'agent', 'recruit'
  preferred_channel text DEFAULT 'email', -- email, sms, slack
  email_opt_in boolean DEFAULT true,
  sms_opt_in boolean DEFAULT false,
  slack_enabled boolean DEFAULT false,
  do_not_contact boolean DEFAULT false,
  unsubscribed_at timestamptz,
  unsubscribe_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, contact_id, contact_type)
);

CREATE INDEX IF NOT EXISTS idx_comm_prefs_user ON communication_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_comm_prefs_contact ON communication_preferences(contact_id, contact_type);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE email_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_scheduled ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE bulk_email_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication_preferences ENABLE ROW LEVEL SECURITY;

-- email_tracking_events policies (via email ownership)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_tracking_events' AND policyname = 'Users can view tracking for own emails') THEN
    CREATE POLICY "Users can view tracking for own emails" ON email_tracking_events
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_emails WHERE id = email_tracking_events.email_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- email_tracking_links policies (via email ownership)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_tracking_links' AND policyname = 'Users can view links for own emails') THEN
    CREATE POLICY "Users can view links for own emails" ON email_tracking_links
      FOR SELECT USING (
        EXISTS (SELECT 1 FROM user_emails WHERE id = email_tracking_links.email_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- email_scheduled policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_scheduled' AND policyname = 'Users can manage own scheduled emails') THEN
    CREATE POLICY "Users can manage own scheduled emails" ON email_scheduled FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- bulk_email_campaigns policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bulk_email_campaigns' AND policyname = 'Users can manage own campaigns') THEN
    CREATE POLICY "Users can manage own campaigns" ON bulk_email_campaigns FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- bulk_email_recipients policies (via campaign ownership)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bulk_email_recipients' AND policyname = 'Users can manage recipients for own campaigns') THEN
    CREATE POLICY "Users can manage recipients for own campaigns" ON bulk_email_recipients
      FOR ALL USING (
        EXISTS (SELECT 1 FROM bulk_email_campaigns WHERE id = bulk_email_recipients.campaign_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- notification_preferences policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notification_preferences' AND policyname = 'Users can manage own notification prefs') THEN
    CREATE POLICY "Users can manage own notification prefs" ON notification_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- communication_preferences policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'communication_preferences' AND policyname = 'Users can manage own communication prefs') THEN
    CREATE POLICY "Users can manage own communication prefs" ON communication_preferences FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- HELPER FUNCTIONS FOR TRACKING
-- ============================================================================

-- Function to record email open (called by tracking pixel endpoint)
CREATE OR REPLACE FUNCTION record_email_open(
  p_tracking_id uuid,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_email_id uuid;
BEGIN
  -- Find email by tracking_id
  SELECT id INTO v_email_id FROM user_emails WHERE tracking_id = p_tracking_id;

  IF v_email_id IS NULL THEN
    RETURN false;
  END IF;

  -- Record event
  INSERT INTO email_tracking_events (email_id, tracking_id, event_type, ip_address, user_agent, device_type, country, city)
  VALUES (v_email_id, p_tracking_id, 'open', p_ip_address, p_user_agent, p_device_type, p_country, p_city);

  -- Update email stats
  UPDATE user_emails
  SET
    open_count = open_count + 1,
    first_opened_at = COALESCE(first_opened_at, now())
  WHERE id = v_email_id;

  -- Update campaign stats if applicable
  UPDATE bulk_email_campaigns
  SET opened_count = opened_count + 1
  WHERE id = (SELECT campaign_id FROM user_emails WHERE id = v_email_id AND campaign_id IS NOT NULL);

  RETURN true;
END;
$$;

-- Function to record email click (called by tracking redirect endpoint)
CREATE OR REPLACE FUNCTION record_email_click(
  p_link_tracking_id uuid,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_device_type text DEFAULT NULL,
  p_country text DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS text -- Returns original URL or NULL if not found
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link record;
BEGIN
  -- Find link by tracking_id
  SELECT * INTO v_link FROM email_tracking_links WHERE tracking_id = p_link_tracking_id;

  IF v_link IS NULL THEN
    RETURN NULL;
  END IF;

  -- Record event
  INSERT INTO email_tracking_events (email_id, tracking_id, event_type, link_url, link_index, ip_address, user_agent, device_type, country, city)
  VALUES (v_link.email_id, p_link_tracking_id, 'click', v_link.original_url, v_link.link_index, p_ip_address, p_user_agent, p_device_type, p_country, p_city);

  -- Update link stats
  UPDATE email_tracking_links
  SET
    click_count = click_count + 1,
    first_clicked_at = COALESCE(first_clicked_at, now())
  WHERE id = v_link.id;

  -- Update email stats
  UPDATE user_emails
  SET
    click_count = click_count + 1,
    first_clicked_at = COALESCE(first_clicked_at, now())
  WHERE id = v_link.email_id;

  -- Update campaign stats if applicable
  UPDATE bulk_email_campaigns
  SET clicked_count = clicked_count + 1
  WHERE id = (SELECT campaign_id FROM user_emails WHERE id = v_link.email_id AND campaign_id IS NOT NULL);

  RETURN v_link.original_url;
END;
$$;

-- Function to get thread stats for a user
CREATE OR REPLACE FUNCTION get_message_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_threads', (SELECT COUNT(*) FROM email_threads WHERE user_id = p_user_id AND NOT is_archived),
    'unread_threads', (SELECT COUNT(*) FROM email_threads WHERE user_id = p_user_id AND unread_count > 0 AND NOT is_archived),
    'total_messages', (SELECT COUNT(*) FROM user_emails WHERE user_id = p_user_id),
    'sent_today', (SELECT COUNT(*) FROM user_emails WHERE user_id = p_user_id AND NOT is_incoming AND created_at >= CURRENT_DATE),
    'sent_this_month', (SELECT COUNT(*) FROM user_emails WHERE user_id = p_user_id AND NOT is_incoming AND created_at >= date_trunc('month', CURRENT_DATE)),
    'scheduled_count', (SELECT COUNT(*) FROM email_scheduled WHERE user_id = p_user_id AND status = 'pending'),
    'draft_count', (SELECT COUNT(*) FROM user_emails WHERE user_id = p_user_id AND status = 'draft')
  ) INTO v_stats;

  RETURN v_stats;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION record_email_open(uuid, inet, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION record_email_click(uuid, inet, text, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_message_stats(uuid) TO authenticated;

-- Allow service_role to insert tracking events (for edge functions)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_tracking_events' AND policyname = 'Service role can insert tracking events') THEN
    CREATE POLICY "Service role can insert tracking events" ON email_tracking_events
      FOR INSERT TO service_role WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'email_tracking_links' AND policyname = 'Service role can manage tracking links') THEN
    CREATE POLICY "Service role can manage tracking links" ON email_tracking_links
      FOR ALL TO service_role USING (true);
  END IF;
END $$;
