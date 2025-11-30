-- Create messaging system for two-way communication between recruits and uplines
-- This complements the existing one-way user_emails table

-- Message Threads Table
CREATE TABLE message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject TEXT NOT NULL,
  participant_ids UUID[] NOT NULL, -- Array of user_profile.id
  created_by UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_message_threads_participants ON message_threads USING GIN(participant_ids);
CREATE INDEX idx_message_threads_last_message ON message_threads(last_message_at DESC);

COMMENT ON TABLE message_threads IS 'Message threads for two-way communication between recruits, uplines, trainers, and admins';
COMMENT ON COLUMN message_threads.participant_ids IS 'Array of user_profile.id participating in this thread';
COMMENT ON COLUMN message_threads.last_message_at IS 'Timestamp of most recent message for sorting';

-- Messages Table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_by UUID[] DEFAULT '{}', -- Array of user_profile.id who read it
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_thread_id ON messages(thread_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

COMMENT ON TABLE messages IS 'Individual messages within message threads';
COMMENT ON COLUMN messages.read_by IS 'Array of user_profile.id who have read this message';

-- Enable RLS
ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_threads

-- Users can only see threads they participate in
CREATE POLICY "Users can view their threads" ON message_threads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = ANY(message_threads.participant_ids)
      AND user_profiles.user_id = auth.uid()
    )
  );

-- Users can create threads if they're a participant
CREATE POLICY "Users can create threads" ON message_threads
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = ANY(participant_ids)
      AND user_profiles.user_id = auth.uid()
    )
  );

-- Users can update threads they participate in (for marking as read, etc.)
CREATE POLICY "Users can update their threads" ON message_threads
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = ANY(message_threads.participant_ids)
      AND user_profiles.user_id = auth.uid()
    )
  );

-- RLS Policies for messages

-- Users can view messages in their threads
CREATE POLICY "Users can view thread messages" ON messages
  FOR SELECT USING (
    thread_id IN (
      SELECT id FROM message_threads
      WHERE EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = ANY(message_threads.participant_ids)
        AND user_profiles.user_id = auth.uid()
      )
    )
  );

-- Users can send messages in their threads
CREATE POLICY "Users can send messages" ON messages
  FOR INSERT WITH CHECK (
    thread_id IN (
      SELECT id FROM message_threads
      WHERE EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = ANY(message_threads.participant_ids)
        AND user_profiles.user_id = auth.uid()
      )
    )
  );

-- Users can update their own messages (for marking as read)
CREATE POLICY "Users can update thread messages" ON messages
  FOR UPDATE USING (
    thread_id IN (
      SELECT id FROM message_threads
      WHERE EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.id = ANY(message_threads.participant_ids)
        AND user_profiles.user_id = auth.uid()
      )
    )
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_message_threads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update triggers
CREATE TRIGGER update_message_threads_updated_at
  BEFORE UPDATE ON message_threads
  FOR EACH ROW EXECUTE FUNCTION update_message_threads_updated_at();

CREATE TRIGGER update_messages_updated_at
  BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_messages_updated_at();

-- Function to add user to read_by array
CREATE OR REPLACE FUNCTION add_to_read_by(message_id UUID, user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE messages
  SET read_by = array_append(read_by, user_id)
  WHERE id = message_id
  AND NOT (user_id = ANY(read_by));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION add_to_read_by IS 'Add user to message read_by array (prevents duplicates)';
