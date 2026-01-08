-- supabase/migrations/20260108_003_linkedin_conversations_messages.sql
-- LinkedIn DM Integration via Unipile - Conversations and Messages Tables

-- ============================================================================
-- Table: linkedin_conversations
-- Stores DM conversation threads with LinkedIn contacts
-- ============================================================================

CREATE TABLE IF NOT EXISTS linkedin_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID NOT NULL REFERENCES linkedin_integrations(id) ON DELETE CASCADE,

  -- Unipile conversation identifiers
  unipile_chat_id TEXT NOT NULL,              -- Chat ID from Unipile API

  -- Participant info (the other person in the DM)
  participant_linkedin_id TEXT NOT NULL,       -- Their LinkedIn member ID
  participant_username TEXT,                   -- LinkedIn vanity URL (e.g., "johndoe")
  participant_name TEXT,                       -- Their display name
  participant_headline TEXT,                   -- Professional headline
  participant_profile_picture_url TEXT,        -- Their profile photo
  participant_profile_url TEXT,                -- Link to their profile

  -- Manually entered contact info (for CRM use)
  participant_email TEXT,                      -- Manually added email
  participant_phone TEXT,                      -- Manually added phone
  contact_notes TEXT,                          -- Notes about this contact

  -- Conversation state
  last_message_at TIMESTAMPTZ,                 -- For sorting conversations
  last_message_preview TEXT,                   -- Truncated preview (100 chars)
  last_message_direction message_direction,    -- 'inbound' or 'outbound'
  unread_count INTEGER DEFAULT 0,

  -- LinkedIn connection status (unlike Instagram, no 24hr window)
  is_connection BOOLEAN DEFAULT false,         -- Are we connected on LinkedIn?
  connection_degree INTEGER,                   -- 1st, 2nd, or 3rd degree
  connection_request_sent_at TIMESTAMPTZ,      -- If pending connection
  connection_request_message TEXT,             -- Message sent with request

  -- Priority/Lead flags for recruiting pipeline (mirrors Instagram)
  is_priority BOOLEAN DEFAULT false,           -- User marked as priority contact
  priority_set_at TIMESTAMPTZ,                 -- When marked as priority
  priority_set_by UUID REFERENCES auth.users(id),
  priority_notes TEXT,                         -- Optional notes about why priority

  -- Link to recruiting lead (if converted)
  recruiting_lead_id UUID,                     -- FK to recruiting_leads

  -- Automation settings
  auto_reminder_enabled BOOLEAN DEFAULT false,
  auto_reminder_template_id UUID,              -- FK to templates table
  auto_reminder_hours INTEGER DEFAULT 24,      -- Hours after last outbound to remind

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- Constraints
  CONSTRAINT linkedin_conversations_unique UNIQUE(integration_id, unipile_chat_id)
);

-- ============================================================================
-- Table: linkedin_messages
-- Stores individual DM messages for local display and audit
-- ============================================================================

CREATE TABLE IF NOT EXISTS linkedin_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES linkedin_conversations(id) ON DELETE CASCADE,

  -- Unipile message identifiers
  unipile_message_id TEXT NOT NULL UNIQUE,     -- From Unipile API

  -- Message content (LinkedIn allows up to ~8000 chars)
  message_text TEXT,
  message_type linkedin_message_type NOT NULL DEFAULT 'text',

  -- Media attachments
  media_url TEXT,
  media_type TEXT,                             -- image, video, document, file

  -- Direction and status (reuse Instagram enums)
  direction message_direction NOT NULL,        -- 'inbound' or 'outbound'
  status instagram_message_status NOT NULL DEFAULT 'delivered',

  -- Sender info
  sender_linkedin_id TEXT NOT NULL,            -- Who sent this message
  sender_name TEXT,

  -- Read/delivery tracking
  sent_at TIMESTAMPTZ NOT NULL,                -- When message was sent
  delivered_at TIMESTAMPTZ,                    -- When delivered to recipient
  read_at TIMESTAMPTZ,                         -- When read by recipient

  -- If this was sent from a template
  template_id UUID,                            -- FK to message_templates

  -- If this was a scheduled message
  scheduled_message_id UUID,                   -- FK to scheduled messages

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- Indexes
-- ============================================================================

-- linkedin_conversations
CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_integration
  ON linkedin_conversations(integration_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_participant
  ON linkedin_conversations(participant_linkedin_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_last_message
  ON linkedin_conversations(integration_id, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_priority
  ON linkedin_conversations(integration_id, is_priority)
  WHERE is_priority = true;

CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_unread
  ON linkedin_conversations(integration_id, unread_count)
  WHERE unread_count > 0;

CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_lead
  ON linkedin_conversations(recruiting_lead_id)
  WHERE recruiting_lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_connection
  ON linkedin_conversations(integration_id, is_connection);

-- For auto-reminder CRON job
CREATE INDEX IF NOT EXISTS idx_linkedin_conversations_auto_reminder
  ON linkedin_conversations(auto_reminder_enabled, last_message_at)
  WHERE auto_reminder_enabled = true;

-- linkedin_messages
CREATE INDEX IF NOT EXISTS idx_linkedin_messages_conversation
  ON linkedin_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_messages_sent_at
  ON linkedin_messages(conversation_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_linkedin_messages_unipile_id
  ON linkedin_messages(unipile_message_id);

CREATE INDEX IF NOT EXISTS idx_linkedin_messages_direction
  ON linkedin_messages(conversation_id, direction, sent_at DESC);

-- ============================================================================
-- Updated_at trigger for conversations
-- ============================================================================

CREATE OR REPLACE FUNCTION update_linkedin_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_linkedin_conversations_updated_at ON linkedin_conversations;
CREATE TRIGGER trigger_linkedin_conversations_updated_at
  BEFORE UPDATE ON linkedin_conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_linkedin_conversations_updated_at();

-- ============================================================================
-- Trigger: Update conversation on new message
-- ============================================================================

CREATE OR REPLACE FUNCTION update_linkedin_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE linkedin_conversations
  SET
    last_message_at = NEW.sent_at,
    last_message_preview = LEFT(NEW.message_text, 100),
    last_message_direction = NEW.direction,
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

DROP TRIGGER IF EXISTS trigger_update_linkedin_conversation_on_message ON linkedin_messages;
CREATE TRIGGER trigger_update_linkedin_conversation_on_message
  AFTER INSERT ON linkedin_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_linkedin_conversation_on_message();

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE linkedin_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_messages ENABLE ROW LEVEL SECURITY;

-- Users can only access conversations from their own integrations
CREATE POLICY "linkedin_conversations_select"
  ON linkedin_conversations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM linkedin_integrations
      WHERE id = linkedin_conversations.integration_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "linkedin_conversations_insert"
  ON linkedin_conversations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linkedin_integrations
      WHERE id = linkedin_conversations.integration_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "linkedin_conversations_update"
  ON linkedin_conversations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM linkedin_integrations
      WHERE id = linkedin_conversations.integration_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "linkedin_conversations_delete"
  ON linkedin_conversations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM linkedin_integrations
      WHERE id = linkedin_conversations.integration_id
      AND user_id = auth.uid()
    )
  );

-- Messages: User can access messages in their conversations
CREATE POLICY "linkedin_messages_select"
  ON linkedin_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM linkedin_conversations c
      JOIN linkedin_integrations i ON i.id = c.integration_id
      WHERE c.id = linkedin_messages.conversation_id
      AND i.user_id = auth.uid()
    )
  );

CREATE POLICY "linkedin_messages_insert"
  ON linkedin_messages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM linkedin_conversations c
      JOIN linkedin_integrations i ON i.id = c.integration_id
      WHERE c.id = linkedin_messages.conversation_id
      AND i.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Grant permissions
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON linkedin_conversations TO authenticated;
GRANT SELECT, INSERT ON linkedin_messages TO authenticated;
GRANT USAGE ON TYPE linkedin_message_type TO authenticated;

COMMENT ON TABLE linkedin_conversations IS 'LinkedIn DM conversation threads with contacts';
COMMENT ON TABLE linkedin_messages IS 'Individual LinkedIn DM messages';
COMMENT ON COLUMN linkedin_conversations.is_connection IS 'Whether we are connected on LinkedIn (1st degree)';
COMMENT ON COLUMN linkedin_conversations.connection_degree IS 'Connection degree: 1, 2, or 3';
COMMENT ON COLUMN linkedin_conversations.is_priority IS 'User marked this contact as a priority for recruiting follow-up';
