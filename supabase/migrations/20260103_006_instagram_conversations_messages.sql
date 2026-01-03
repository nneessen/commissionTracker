-- supabase/migrations/20260103_006_instagram_conversations_messages.sql
-- Instagram DM Integration - Conversations and Messages Tables

-- ============================================================================
-- Table: instagram_conversations
-- Stores DM conversation threads with contacts
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES instagram_integrations(id) ON DELETE CASCADE,

  -- Instagram conversation identifiers
  instagram_conversation_id TEXT NOT NULL,   -- From Instagram API

  -- Participant info (the other person in the DM)
  participant_instagram_id TEXT NOT NULL,    -- Their IG user ID
  participant_username TEXT,                 -- Their @handle
  participant_name TEXT,                     -- Their display name
  participant_profile_picture_url TEXT,      -- Their profile photo

  -- Conversation state
  last_message_at TIMESTAMPTZ,              -- For sorting conversations
  last_message_preview TEXT,                 -- Truncated preview (50 chars)
  last_message_direction message_direction,  -- 'inbound' or 'outbound'
  unread_count INTEGER DEFAULT 0,

  -- 24-hour messaging window tracking (Instagram policy)
  -- After user DMs you, you have 24 hours to reply freely
  can_reply_until TIMESTAMPTZ,               -- When messaging window expires
  last_inbound_at TIMESTAMPTZ,               -- Last time they messaged us (resets window)

  -- Priority/Lead flags for recruiting pipeline
  is_priority BOOLEAN DEFAULT false,         -- User marked as priority contact
  priority_set_at TIMESTAMPTZ,               -- When marked as priority
  priority_set_by UUID REFERENCES auth.users(id),
  priority_notes TEXT,                       -- Optional notes about why priority

  -- Link to recruiting lead (if converted)
  recruiting_lead_id UUID,                   -- FK added after recruiting_leads is extended

  -- Automation settings
  auto_reminder_enabled BOOLEAN DEFAULT false,
  auto_reminder_template_id UUID,            -- FK to templates table
  auto_reminder_hours INTEGER DEFAULT 12,    -- Hours after last outbound to remind

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT instagram_conversations_unique UNIQUE(integration_id, instagram_conversation_id)
);

-- ============================================================================
-- Table: instagram_messages
-- Stores individual DM messages for local display and audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS instagram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES instagram_conversations(id) ON DELETE CASCADE,

  -- Instagram message identifiers
  instagram_message_id TEXT NOT NULL UNIQUE, -- From Instagram API

  -- Message content
  message_text TEXT,                          -- Content (up to 1000 chars)
  message_type instagram_message_type NOT NULL DEFAULT 'text',

  -- Media attachments (for media messages)
  media_url TEXT,
  media_type TEXT,                            -- image, video, audio, file

  -- Story-specific fields (for story_reply and story_mention)
  story_id TEXT,
  story_url TEXT,

  -- Direction and status
  direction message_direction NOT NULL,       -- 'inbound' or 'outbound'
  status instagram_message_status NOT NULL DEFAULT 'delivered',

  -- Sender info
  sender_instagram_id TEXT NOT NULL,          -- Who sent this message
  sender_username TEXT,

  -- Read/delivery tracking
  sent_at TIMESTAMPTZ NOT NULL,               -- When message was sent
  delivered_at TIMESTAMPTZ,                   -- When delivered to recipient
  read_at TIMESTAMPTZ,                        -- When read by recipient

  -- If this was sent from a template
  template_id UUID,                           -- FK to templates

  -- If this was a scheduled message
  scheduled_message_id UUID,                  -- FK to scheduled messages

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- instagram_conversations
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_integration
  ON instagram_conversations(integration_id);

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_participant
  ON instagram_conversations(participant_instagram_id);

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_last_message
  ON instagram_conversations(integration_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_priority
  ON instagram_conversations(integration_id, is_priority)
  WHERE is_priority = true;

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_unread
  ON instagram_conversations(integration_id, unread_count)
  WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_window
  ON instagram_conversations(can_reply_until)
  WHERE can_reply_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_instagram_conversations_lead
  ON instagram_conversations(recruiting_lead_id)
  WHERE recruiting_lead_id IS NOT NULL;

-- For auto-reminder CRON job
CREATE INDEX IF NOT EXISTS idx_instagram_conversations_auto_reminder
  ON instagram_conversations(auto_reminder_enabled, last_message_at)
  WHERE auto_reminder_enabled = true;

-- instagram_messages
CREATE INDEX IF NOT EXISTS idx_instagram_messages_conversation
  ON instagram_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_instagram_messages_sent_at
  ON instagram_messages(conversation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_messages_ig_id
  ON instagram_messages(instagram_message_id);

CREATE INDEX IF NOT EXISTS idx_instagram_messages_direction
  ON instagram_messages(conversation_id, direction, sent_at DESC);

-- ============================================================================
-- Updated_at trigger for conversations
-- ============================================================================

CREATE OR REPLACE FUNCTION update_instagram_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_instagram_conversations_updated_at ON instagram_conversations;
CREATE TRIGGER trigger_instagram_conversations_updated_at
  BEFORE UPDATE ON instagram_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_instagram_conversations_updated_at();

-- ============================================================================
-- Trigger: Update conversation on new message
-- ============================================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE instagram_conversations
  SET
    last_message_at = NEW.sent_at,
    last_message_preview = LEFT(NEW.message_text, 50),
    last_message_direction = NEW.direction,
    -- Reset 24-hour window on inbound message
    can_reply_until = CASE
      WHEN NEW.direction = 'inbound'
      THEN NEW.sent_at + INTERVAL '24 hours'
      ELSE can_reply_until
    END,
    last_inbound_at = CASE
      WHEN NEW.direction = 'inbound'
      THEN NEW.sent_at
      ELSE last_inbound_at
    END,
    -- Clear unread for outbound, increment for inbound
    unread_count = CASE
      WHEN NEW.direction = 'inbound'
      THEN unread_count + 1
      ELSE unread_count
    END,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_conversation_on_message ON instagram_messages;
CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON instagram_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE instagram_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE instagram_messages ENABLE ROW LEVEL SECURITY;

-- Users can only access conversations from their own integrations
CREATE POLICY "instagram_conversations_select"
  ON instagram_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instagram_integrations
      WHERE id = instagram_conversations.integration_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "instagram_conversations_insert"
  ON instagram_conversations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instagram_integrations
      WHERE id = instagram_conversations.integration_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "instagram_conversations_update"
  ON instagram_conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM instagram_integrations
      WHERE id = instagram_conversations.integration_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "instagram_conversations_delete"
  ON instagram_conversations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM instagram_integrations
      WHERE id = instagram_conversations.integration_id
      AND user_id = auth.uid()
    )
  );

-- Messages: User can access messages in their conversations
CREATE POLICY "instagram_messages_select"
  ON instagram_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM instagram_conversations c
      JOIN instagram_integrations i ON i.id = c.integration_id
      WHERE c.id = instagram_messages.conversation_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "instagram_messages_insert"
  ON instagram_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM instagram_conversations c
      JOIN instagram_integrations i ON i.id = c.integration_id
      WHERE c.id = instagram_messages.conversation_id
      AND i.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON instagram_conversations TO authenticated;
GRANT SELECT, INSERT ON instagram_messages TO authenticated;
GRANT USAGE ON TYPE message_direction TO authenticated;
GRANT USAGE ON TYPE instagram_message_type TO authenticated;
GRANT USAGE ON TYPE instagram_message_status TO authenticated;

COMMENT ON TABLE instagram_conversations IS 'Instagram DM conversation threads with contacts';
COMMENT ON TABLE instagram_messages IS 'Individual Instagram DM messages';
COMMENT ON COLUMN instagram_conversations.can_reply_until IS 'Instagram 24-hour messaging window - after this time, cannot send until they message again';
COMMENT ON COLUMN instagram_conversations.is_priority IS 'User marked this contact as a priority for recruiting follow-up';
